/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {fs} from '../../platform/fs-web.js';
import diff from 'diff';

const testData = [
  {
    label: 'C++',
    generated: 'src/tools/tests/golden.h',
    golden: 'src/tools/tests/goldens/generated-schemas.h',
  },
  {
    label: 'Kotlin (JVM)',
    generated: 'src/tools/tests/golden_GeneratedSchemas.jvm.kt',
    golden: 'src/tools/tests/goldens/generated-schemas.jvm.kt',
  },
  {
    label: 'Kotlin (wasm)',
    generated: 'src/tools/tests/golden_GeneratedSchemas.wasm.kt',
    golden: 'src/tools/tests/goldens/generated-schemas.wasm.kt',
  },
  {
    label: 'Test Harness - Kotlin',
    generated: 'src/tools/tests/golden_TestHarness.kt',
    golden: 'src/tools/tests/goldens/generated-test-harness.kt',
  },
  {
    label: 'Kotlin (Kotlin-specific features)',
    generated: 'src/tools/tests/golden-kt_GeneratedSchemas.jvm.kt',
    golden: 'src/tools/tests/goldens/kt_generated-schemas.jvm.kt',
  }
];

testData.forEach(data => {
  describe(`${data.label} particle code generation`, () => {
    before(function() {
      if (!global['testFlags'].bazel) {
        this.skip();
      }
    });

    it(`matches golden file ${data.golden}`, () => {
      const golden = fs.readFileSync(data.golden, 'utf-8');
      const actual = fs.readFileSync(data.generated, 'utf-8');

      if (golden === actual) {
        // All good!
        return;
      }

      const diffLog: string[] = [];
      const changes = diff.diffLines(golden, actual);
      changes.forEach(change => {
        if (!change.added && !change.removed) {
          return;
        }
        const operator = change.added ? '+' : '-';
        const lines = change.value.trimEnd().split('\n');
        diffLog.push(...lines.map(line => `${operator} ${line}`));
      });

      assert.fail(`

    Generated ${data.label} file does not match golden! Diff:

    ${diffLog.join('\n    ')}

    Run the following command to update the golden file:

    cp "bazel-bin/${data.generated}" "${data.golden}"
`);
    });
  });
});

