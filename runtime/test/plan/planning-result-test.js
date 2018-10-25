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
    assert.isNotEmpty(helper.plans);
    const result = new PlanningResult(helper.arc, {plans: helper.plans});

    const serialization = result.serialize();
    assert(serialization.plans);
    const resultNew = new PlanningResult(helper.arc);
    assert.isEmpty(resultNew.plans);
    await resultNew.deserialize({plans: serialization.plans});
    assert.isTrue(resultNew.isEquivalent(helper.plans));
  }
  it('serializes and deserializes Products recipes', async function() {
    await testResultSerialization('./runtime/test/artifacts/Products/Products.recipes');
  });

  // TODO: add more recipes tests.
});
