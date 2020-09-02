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
import {regenerateInputFile} from './codegen-unit-test-base.js';

/**
 * Updates expectations in all .cgtest files.
 *
 * ./tools/sigh updateCodegenUnitTests
 */
let totalUpdateCount = 0;

async function update() {
  // It's important that these execute in sequence rather than in parallel,
  // otherwise they get in each other's way (flags, storage registrations, etc.)
  for (const testCase of schema2KotlinTestSuite.concat(recipe2PlanTestSuite)) {
    const updateCount = await regenerateInputFile(testCase);
    if (updateCount > 0) {
      console.info(`${testCase.inputFileName}: ${updateCount} tests updated`);
    }
    totalUpdateCount += updateCount;
  }
  if (totalUpdateCount === 0) {
    console.info(`All tests up to date!`);
  }
}

void update().catch(e => {
  console.error(e.stack);
  process.exit(1);
});
