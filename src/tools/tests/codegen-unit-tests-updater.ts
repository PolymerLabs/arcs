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
import {regenerateInputFile} from './codegen-unit-test-base.js';

/**
 * Updates expectations in all .cgtest files.
 *
 * ./tools/sigh updateCodegenUnitTests
 */
let totalUpdateCount = 0;
void Promise.all(testSuite.map(async testCase => {
  const updateCount = await regenerateInputFile(testCase);
  if (updateCount > 0) {
    console.info(`${testCase.inputFileName}: ${updateCount} tests updated`);
  }
  totalUpdateCount += updateCount;
})).then(() => {
  if (totalUpdateCount === 0) {
    console.info(`All tests up to date!`);
  }
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
