/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SequenceTest, ExpectedResponse} from '../sequence.js';
import {assert} from '../../../platform/chai-web.js';

class BadClass {
  total = 0;
  async input(value) {
    let total = this.total;
    await 0;
    total += value;
    await 0;
    this.total = total;
  }
}

describe('Sequence testing infrastructure', async () => {
  it('picks up a basic error in return values', async () => {
    const flowTest = new SequenceTest<BadClass>();
    flowTest.setTestConstructor(() => new BadClass());

    const input = flowTest.registerInput('input', 2,
        {type: ExpectedResponse.Constant, response: true});
    const total = flowTest.registerSensor('total');

    const inputChanges = [{input: [1]}, {input: [2]}];
    flowTest.setChanges(input, inputChanges);

    flowTest.setEndInvariant(total, (value) => assert.strictEqual(value, 3));

    try {
      await flowTest.test();
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.message, 'expected undefined to equal true');
    }
  });
  it('picks up a basic error in an async class', async () => {
    const flowTest = new SequenceTest<BadClass>();
    flowTest.setTestConstructor(() => new BadClass());

    const input = flowTest.registerInput('input', 2,
        {type: ExpectedResponse.Void});
    const total = flowTest.registerSensor('total');

    const inputChanges = [{input: [1]}, {input: [2]}];
    flowTest.setChanges(input, inputChanges);

    flowTest.setEndInvariant(total, (value) => assert.strictEqual(value, 3));

    try {
      await flowTest.test();
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.message, 'expected 2 to equal 3');
    }
  });
  it('picks up a bad count of internal awaits', async () => {
    const flowTest = new SequenceTest<BadClass>();
    flowTest.setTestConstructor(() => new BadClass());

    const input = flowTest.registerInput('input', 1,
        {type: ExpectedResponse.Void});
    const total = flowTest.registerSensor('total');

    const inputChanges = [{input: [1]}];
    flowTest.setChanges(input, inputChanges);

    flowTest.setEndInvariant(total, (value) => assert.strictEqual(value, 1));

    try {
      await flowTest.test();
      assert.fail();
    } catch (e) {
      assert.strictEqual(e.message, 'Additional async point found!');
    }
  });
});
