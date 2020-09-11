/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {CountOpTypes, CRDTCount, CRDTError, ChangeType} from '../lib-crdt.js';

describe('CRDTCount', () => {

  it('initially has value 0', () => {
    const count = new CRDTCount();
    assert.strictEqual(count.getParticleView(), 0);
  });

  it('can apply an increment op', () => {
    const count = new CRDTCount();
    assert.isTrue(count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}));
    assert.strictEqual(count.getParticleView(), 1);
  });

  it('can apply two increment ops from different actors', () => {
    const count = new CRDTCount();
    assert.isTrue(count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}));
    assert.isTrue(count.applyOperation({type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}}));
    assert.strictEqual(count.getParticleView(), 2);
  });

  it('resolves increment ops from the same actor', () => {
    const count = new CRDTCount();
    assert.isTrue(count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}));
    assert.isTrue(count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 1, to: 2}}));
    assert.strictEqual(count.getParticleView(), 2);
  });

  it('does not resolve duplicated ops from the same actor', () => {
    const count = new CRDTCount();
    assert.isTrue(count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}));
    assert.isFalse(count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}));
    assert.strictEqual(count.getParticleView(), 1);
  });

  it('can apply a multi-increment op', () => {
    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 7, version: {from: 0, to: 1}});
    assert.strictEqual(count.getParticleView(), 7);
  });

  it('merges two models with counts from different actors', () => {
    const count1 = new CRDTCount();
    const count2 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 7, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'them', value: 4, version: {from: 0, to: 1}});
    const {modelChange, otherChange} = count1.merge(count2.getData());
    assert.strictEqual(count1.getParticleView(), 11);

    if (modelChange.changeType === ChangeType.Operations) {
      assert.strictEqual(modelChange.operations.length, 1);
      assert.deepEqual(modelChange.operations[0], {actor: 'them', value: 4, type: CountOpTypes.MultiIncrement, version: {from: 0, to: 1}});
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Operations');
    }

    if (otherChange.changeType === ChangeType.Operations) {
      assert.strictEqual(otherChange.operations.length, 1);
      assert.deepEqual(otherChange.operations[0], {actor: 'me', value: 7, type: CountOpTypes.MultiIncrement, version: {from: 0, to: 1}});

      assert.isTrue(count2.applyOperation(otherChange.operations[0]));
      assert.deepEqual(count1.getData(), count2.getData());
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Operations');
    }
  });

  it('merges two models with counts from the same actor', () => {
    const count1 = new CRDTCount();
    const count2 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 7, version: {from: 0, to: 2}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 4, version: {from: 0, to: 1}});
    const {modelChange, otherChange} = count1.merge(count2.getData());
    assert.strictEqual(count1.getParticleView(), 7);

    if (modelChange.changeType === ChangeType.Operations) {
      assert.strictEqual(modelChange.operations.length, 0);
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Operations');
    }

    if (otherChange.changeType === ChangeType.Operations) {
      assert.strictEqual(otherChange.operations.length, 1);
      assert.deepEqual(otherChange.operations[0], {actor: 'me', value: 3, type: CountOpTypes.MultiIncrement, version: {from: 1, to: 2}});

      assert.isTrue(count2.applyOperation(otherChange.operations[0]));
      assert.deepEqual(count1.getData(), count2.getData());
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Operations');
    }
  });

  it('throws when attempting to merge divergent models', () => {
    const count1 = new CRDTCount();
    const count2 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 7, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 4, version: {from: 0, to: 1}});
    assert.throws(() => count1.merge(count2.getData()), CRDTError);
  });

  it('throws when values appear to have been decremented', () => {
    const count1 = new CRDTCount();
    const count2 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 7, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 4, version: {from: 0, to: 2}});
    assert.throws(() => count1.merge(count2.getData()), CRDTError);
  });

  it('merges two models with counts from the multiple actors', () => {
    const count1 = new CRDTCount();
    const count2 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'a', value: 6, version: {from: 0, to: 1}});
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'c', value: 12, version: {from: 0, to: 2}});
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'd', value: 22, version: {from: 0, to: 1}});
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'e', value: 4, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'b', value: 5, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'c', value: 9, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'd', value: 22, version: {from: 0, to: 1}});
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'e', value: 14, version: {from: 0, to: 2}});

    const {modelChange, otherChange} = count1.merge(count2.getData());
    assert.strictEqual(count1.getParticleView(), 59); // expect 5 / 6 / 12 / 22 / 14

    if (modelChange.changeType === ChangeType.Operations) {
      assert.strictEqual(modelChange.operations.length, 2);
      assert.deepEqual(modelChange.operations[0], {actor: 'b', value: 5, type: CountOpTypes.MultiIncrement, version: {from: 0, to: 1}});
      assert.deepEqual(modelChange.operations[1], {actor: 'e', value: 10, type: CountOpTypes.MultiIncrement, version: {from: 1, to: 2}});    } else {
      assert.fail('modelChange.changeType should be ChangeType.Operations');
    }

    if (otherChange.changeType === ChangeType.Operations) {
      assert.strictEqual(otherChange.operations.length, 2);
      assert.deepEqual(otherChange.operations[0], {actor: 'c', value: 3, type: CountOpTypes.MultiIncrement, version: {from: 1, to: 2}});
      assert.deepEqual(otherChange.operations[1], {actor: 'a', value: 6, type: CountOpTypes.MultiIncrement, version: {from: 0, to: 1}});

      assert.isTrue(count2.applyOperation(otherChange.operations[0]));
      assert.isTrue(count2.applyOperation(otherChange.operations[1]));
      assert.deepEqual(count1.getData(), count2.getData());
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Operations');
    }
  });
});
