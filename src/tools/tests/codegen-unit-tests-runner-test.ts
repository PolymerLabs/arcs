/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {testSuite} from './kotlin-codegen-test-suite.js';
import {readTests, runCompute} from './codegen-unit-test-base.js';
import {assert} from '../../platform/chai-web.js';

/**
 * Runs all the CodegenUnitTests.
 *
 * Note that this has to be in a separate file as the test logic has to be accessible
 * in the CLI tool performing updating, where describe(...) and it(...) are not defined.
 */
for (const unit of testSuite) {
  describe(unit.title, async () => {
    for (const test of readTests(unit)) {
      it(test.name, async () => assert.deepEqual(await runCompute(unit, test), test.results));
    }
  });
}
