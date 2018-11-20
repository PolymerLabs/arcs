/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import {TestHelper} from '../../testing/test-helper.js';
import {PlanningResult} from '../../ts-build/plan/planning-result.js';

describe('planning result', function() {
  async function testResultSerialization(manifestFilename) {
    const helper = await TestHelper.createAndPlan({manifestFilename});
    assert.isNotEmpty(helper.suggestions);
    const result = new PlanningResult(helper.arc, {suggestions: helper.suggestions});

    const serialization = result.serialize();
    assert(serialization.suggestions);
    const resultNew = new PlanningResult(helper.arc);
    assert.isEmpty(resultNew.suggestions);
    await resultNew.deserialize({suggestions: serialization.suggestions});
    assert.isTrue(resultNew.isEquivalent(helper.suggestions));
  }
  it('serializes and deserializes Products recipes', async function() {
    await testResultSerialization('./runtime/test/artifacts/Products/Products.recipes');
  });

  // TODO: add more recipes tests.
});
