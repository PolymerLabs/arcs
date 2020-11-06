/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import fs from 'fs';
import {Manifest} from '../../runtime/manifest.js';
import {Flags} from '../../runtime/flags.js';
import {Runtime} from '../../runtime/runtime.js';

type Test = {
  name: string;
  options: object;
  input: string;
  results: string[];
  perLine: boolean;
  require?: string;
};

/**
 * A base class for unit tests of codegen.
 *
 * To use this class one has to do 2 things:
 * - Write a .cgtest in goldens/ directory that specifies a set of
 *   inputs and expected outputs for codegen.
 * - Add a CodegenUnitTest to a test suite (e.g. kotlin-codegen-test-suite.ts)
 *   with the code that should run for each input.
 *
 * The main benefit of using this approach is programmatic updating of
 * expectations in .cgtest files via ./tools/sigh updateCodegenUnitTests
 *
 * .cgtest files have one or more tests defined as following:
 *
 * [name]
 * name of your test here
 * [opts] // <- this is optional
 * {"extraParam": 42} // JSON Object with extra arguments
 * [results] // or [results:per-line] to treat each line as a separate result
 * expected output goes here
 * [next] // <- this is optional, only use for multiple outputs; not needed with 'per-line'
 * another expected output
 * [require] // <- this is optional, use when you want to assert additional properties of the output
 * test-specific formatted requirements
 * [end]
 */
export abstract class CodegenUnitTest {

  constructor(
    readonly title: string,
    readonly inputFileName: string
  ) {}

  get inputFilePath() {
    return `./src/tools/tests/goldens/${this.inputFileName}`;
  }

  /**
   * Calculates the codegen result for the given input.
   */
  abstract async compute(input: string, opts: object, test: Test): Promise<string | string[]>;
}

/**
 * Convenience base class for tests that take Arcs manifest as an input.
 */
export abstract class ManifestCodegenUnitTest extends CodegenUnitTest {

  constructor(
    title: string,
    inputFileName: string,
    private flags = {}
  ) {
    super(title, inputFileName);
  }

  async compute(input: string, opts: object, test: Test): Promise<string | string[]> {
    return Flags.withFlags(this.flags, async () => {
      const manifest = await Manifest.parse(input, {fileName: `${this.inputFileName}: ${test.name}`});
      return this.computeFromManifest(manifest, opts, test);
    })();
  }

  abstract async computeFromManifest(manifest: Manifest, opts: object, test: Test): Promise<string | string[]>;
}

// Internal utilities below

/**
 * Run the computation for a given test with cleanups and data normalization.
 */
export async function runCompute(testCase: CodegenUnitTest, test: Test): Promise<string[]> {
  Flags.reset();
  const result = await testCase.compute(test.input, test.options, test);
  return Array.isArray(result) ? result : [result];
}

/**
 * Reads out Test data structure from the input .cgtest file.
 */
export function readTests(unitTest: CodegenUnitTest): Test[] {
  let fileData = fs.readFileSync(unitTest.inputFilePath, 'utf-8');
  const tests: Test[] = [];

  // Separator.
  const sep = (name: string, extra = '') => `-*\\[${name}${extra}\\]-*`;

  fileData = fileData.replace(new RegExp(`${sep('header')}.*${sep('end_header')}\n*`, 'sm'), '');
  const caseStrings = (fileData).split(new RegExp(`\\n${sep('end')}`));
  for (const caseString of caseStrings) {
    const caseAndRequire = caseString.match(new RegExp(`(.*)\\n${sep('require')}\\n(.*)`, 'sm'));
    const cases = caseAndRequire == null ? caseString : caseAndRequire[1];
    const require = caseAndRequire == null ? null : caseAndRequire[2].trim();
    if (cases.trim().length === 0) continue;
    const matches = cases.match(new RegExp(
      `\\w*^${sep('name')}\\n([^\\n]*)(?:\\n${sep('opts')}\\n(.*))?\\n${sep('input')}\\n(.*)\\n${sep('results', '(:per-line)?')}\\n?(.*)`, 'sm'
    ));
    if (!matches) {
      throw Error(`Cound not parse a test case: ${caseString}`);
    }

    const perLine = matches[4] === ':per-line';
    tests.push({
      name: matches[1].trim(),
      options: JSON.parse(matches[2] || '{}'),
      input: matches[3],
      results: matches[5].split(perLine ? '\n' : new RegExp(`\\n${sep('next')}\\n`)),
      require,
      perLine
    });
  }

  return tests;
}

/**
 * Updates expectations in the input .cgtest file.
 */
export async function regenerateInputFile(unit: CodegenUnitTest): Promise<number> {
  const tests = readTests(unit);

  let updatedCount = 0;
  const newTests = [];

  // Separator.
  function sep(name: string, extra = '') {
    return `-----[${name}${extra}]-----`;
  }

  // It's important to sequence these (rather than e.g. using Promise.all) because each
  // can interfere with the others (specifically via flags and storage registrations).
  for (const test of tests) {
    const results = await runCompute(unit, test);

    if (JSON.stringify(results) !== JSON.stringify(test.results)) {
      updatedCount++;
    }

    const optionsString = Object.entries(test.options).length === 0 ? '' : `\
${sep('opts')}
${JSON.stringify(test.options)}
`;

    const result = `\
${sep('name')}
${test.name}
${optionsString}${sep('input')}
${test.input}
${sep('results', test.perLine ? ':per-line' : '')}
${results.join(test.perLine ? '\n' : `\n${sep('next')}\n`)}${test.require == null ? '' : `
${sep('require')}
${test.require}`}
${sep('end')}
`;
    newTests.push(result);
  }

  const content = `\
${sep('header')}
${unit.title}

Expectations can be updated with:
$ ./tools/sigh updateCodegenUnitTests
${sep('end_header')}

${newTests.join('\n')}`;

  fs.writeFileSync(unit.inputFilePath, content);
  return updatedCount;
}
