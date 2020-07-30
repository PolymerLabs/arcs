/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {schema2KotlinTestSuite} from './schema2kotlin-codegen-test-suite.js';
import {recipe2PlanTestSuite} from './recipe2plan-codegen-test-suite.js';
import {readTests, runCompute} from './codegen-unit-test-base.js';
import {assert} from '../../platform/chai-web.js';
import {Dictionary} from '../../runtime/hot.js';

function extractAllByRE(regexp: RegExp, result: string): string[][] {
  let match: string[];
  const results = [];
  while ((match = regexp.exec(result)) !== null) {
    results.push(match);
  }
  return results;
}

const handleStorageKeyRE = /([^_ ]+)_([^ ]+) = Handle\(\n *StorageKeyParser.parse\("([^"]*")\)/;

/**
 * Runs all the CodegenUnitTests.
 *
 * Note that this has to be in a separate file as the test logic has to be accessible
 * in the CLI tool performing updating, where describe(...) and it(...) are not defined.
 */
for (const unit of schema2KotlinTestSuite.concat(recipe2PlanTestSuite)) {
  describe(unit.title, async () => {
    for (const test of readTests(unit)) {
      it(test.name, async () => {
        assert.deepEqual(await runCompute(unit, test), test.results);
        if (test.require) {
          // "results" is exposed for the eval'ed require expression.
          const results = test.results;

          const storageKeys: Dictionary<Dictionary<string>> = {};
          results.forEach(result => {
            extractAllByRE(RegExp(handleStorageKeyRE, 'mg'), result).forEach(result => {
                if (storageKeys[result[1]] == undefined) {
                  storageKeys[result[1]] = {};
                }
                storageKeys[result[1]][result[2]] = result[3];
            });
          });

          test.require.split('\n').forEach(requireCase => assert.isTrue(eval(requireCase), requireCase));
        }
      });
    }
  });
}
