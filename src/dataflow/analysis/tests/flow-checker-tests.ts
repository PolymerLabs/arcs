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
import {FlowAssertion} from '../flow-assertion.js';
import {FlowConfig} from '../flow-config.js';
import {FlowChecker} from '../flow-checker.js';

describe('Dataflow analysis', () => {
  it('FlowAssertion validates assertion strings correctly', async () => {
    let s = 'no colons';
    assert.equal(undefined, FlowAssertion.instantiate(s));
    s = 'name : but nothing else';
    assert.equal(undefined, FlowAssertion.instantiate(s));
    s = 'name: all : particles : are trusted';
    assert.notEqual(undefined, FlowAssertion.instantiate(s));
  });

  it('FlowConfig parses a set of assertions', async () => {
    const s = ['first assertion: all : particles : are trusted',
             'second assertion: no : senstive data : is written to : untrusted particle'];
    const fc = new FlowConfig(s);
    assert.notEqual(undefined, fc.assertions);
  });
  // This test, while trivial, does in fact test that the code works, because
  // the code currently always returns false. Once the test fails, it serves as
  // a reminder to write a real test.
  it('flowcheck fails', async () => {
    const s = ['first assertion: all : particles : are trusted',
             'second assertion: no : senstive data : is written to : untrusted particle'];
    const fc = new FlowConfig(s);
    const checker = new FlowChecker(fc);
    const recipe = new Recipe();
    assert.equal(false, checker.flowcheck(recipe).result);
  });
});