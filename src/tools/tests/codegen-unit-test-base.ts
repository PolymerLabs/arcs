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

type Test = {
  name: string;
  options: object;
  input: string;
  results: string[];
  perLine: boolean;
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
  abstract async compute(input: string, opts: object): Promise<string | string[]>;
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

  async compute(input: string, opts: object): Promise<string | string[]> {
    return Flags.withFlags(this.flags, async () => this.computeFromManifest(await Manifest.parse(input), opts))();
  }

  abstract async computeFromManifest(manifest: Manifest, opts: object): Promise<string | string[]>;
}

// Internal utilities below

/**
 * Run the computation for a given test with cleanups and data normalization.
 */
export async function runCompute(testCase: CodegenUnitTest, test: Test): Promise<string[]> {
  Flags.reset();
  const result = await testCase.compute(test.input, test.options);
  return Array.isArray(result) ? result : [result];
}

/**
 * Reads out Test data structure from the input .cgtest file.
 */
export function readTests(unitTest: CodegenUnitTest): Test[] {
  let fileData = fs.readFileSync(unitTest.inputFilePath, 'utf-8');
  const tests: Test[] = [];

  fileData = fileData.replace(/\[header\].*\[end_header\]\n*/sm, '');

  const caseStrings = (fileData).split('\n[end]');
  for (const caseString of caseStrings) {
    if (caseString.trim().length === 0) continue;
    const matches = caseString.match(
      /\w*^\[name\]\n([^\n]*)(?:\n\[opts\]\n(.*))?\n\[input\]\n(.*)\n\[results(:per-line)?\]\n?(.*)/sm
    );
    if (!matches) {
      throw Error(`Cound not parse a test case: ${caseString}`);
    }

    const perLine = matches[4] === ':per-line';
    tests.push({
      name: matches[1].trim(),
      options: JSON.parse(matches[2] || '{}'),
      input: matches[3],
      results: matches[5].split(perLine ? '\n' : '\n[next]\n'),
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

  const newTests = await Promise.all(tests.map(async test => {
    const results = await runCompute(unit, test);

    if (JSON.stringify(results) !== JSON.stringify(test.results)) {
      updatedCount++;
    }

    const optionsString = Object.entries(test.options).length === 0 ? '' : `\
[opts]
${JSON.stringify(test.options)}
`;

    return `\
[name]
${test.name}
${optionsString}[input]
${test.input}
[results${test.perLine ? ':per-line' : ''}]
${results.join(test.perLine ? '\n' : '\n[next]\n')}
[end]
`;
  }));

  const content = `\
[header]
${unit.title}

Expectations can be updated with:
$ ./tools/sigh updateCodegenUnitTests
[end_header]

${newTests.join('\n')}`;

  fs.writeFileSync(unit.inputFilePath, content);
  return updatedCount;
}
