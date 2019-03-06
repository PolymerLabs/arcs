/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Recipe} from '../../../runtime/recipe/recipe.js';
import {FlowConfig} from '../flowconfig.js';
import {FlowChecker} from '../flowchecker.js';

describe('Dataflow analysis', () => {
  // This test, while trivial, does in fact test that the code works, because
  // the code currently always returns false. Once the test fails, it serves as
  // a reminder to write a real test.
  it('flowcheck returns false', async () => {
    const fc = new FlowConfig(["Data from A is not visible to E"]); // no languages yet
    const checker = new FlowChecker(fc);
    const recipe = new Recipe();
    assert.equal(false, checker.flowcheck(recipe));
  });
});