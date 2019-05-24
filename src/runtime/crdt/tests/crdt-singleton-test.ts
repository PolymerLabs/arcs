/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {ChangeType, CRDTError} from '../crdt';
import {CRDTSingleton, SingletonOpTypes} from '../crdt-singleton';

describe('CRDTSingleton', () => {
  it('can set values from a single actor', () => {
    const singleton = new CRDTSingleton<string>();
    assert.equal(singleton.getParticleView(), null);

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '1',
      actor: 'A',
      clock: new Map([['A', 1]]),
    });
    assert.equal(singleton.getParticleView(), '1');

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '2',
      actor: 'A',
      clock: new Map([['A', 2]]),
    });
    assert.equal(singleton.getParticleView(), '2');

    // Set requires version increment, so this fails.
    assert.isFalse(singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '3',
      actor: 'A',
      clock: new Map([['A', 2]]),
    }));
    assert.equal(singleton.getParticleView(), '2');
  });

  it('can clear values', () => {
    const singleton = new CRDTSingleton<string>();
    assert.equal(singleton.getParticleView(), null);

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '1',
      actor: 'A',
      clock: new Map([['A', 1]]),
    });
    assert.equal(singleton.getParticleView(), '1');

    // Clear requires the same version number, so this does not really clear it.
    singleton.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      clock: new Map([['A', 0]]),
    });
    assert.equal(singleton.getParticleView(), '1');
    singleton.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      clock: new Map([['A', 2]]),
    });
    assert.equal(singleton.getParticleView(), '1');

    // Up-to-date version number, does clear it.
    singleton.applyOperation(
      {type: SingletonOpTypes.Clear, actor: 'A', clock: new Map([['A', 1]])});
    assert.equal(singleton.getParticleView(), null);
  });

  it('can add and clear from multiple actors', () => {
    const singleton = new CRDTSingleton<string>();
    assert.equal(singleton.getParticleView(), null);

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '1',
      actor: 'A',
      clock: new Map([['A', 1]]),
    });
    assert.deepEqual(
      singleton.getData().values, new Map([['1', new Map([['A', 1]])]]));
    assert.equal(singleton.getParticleView(), '1');

    // Another actor concurrently setting a value, both values will be kept.
    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '2',
      actor: 'B',
      clock: new Map([['B', 1]]),
    });
    assert.deepEqual(
      singleton.getData().values,
      new Map([['1', new Map([['A', 1]])], ['2', new Map([['B', 1]])]]));
    assert.equal(singleton.getParticleView(), '1');

    // Actor B setting a new value after also seeing A's value, old value is
    // removed.
    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: '2',
      actor: 'B',
      clock: new Map([['A', 1], ['B', 2]]),
    });
    assert.deepEqual(
      singleton.getData().values,
      new Map([['2', new Map([['A', 1], ['B', 2]])]]));
    assert.equal(singleton.getParticleView(), '2');

    singleton.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      clock: new Map([['A', 1], ['B', 2]])
    });
    assert.deepEqual(singleton.getData().values, new Map());
    assert.equal(singleton.getParticleView(), null);
  });

  it('can merge two singletons', () => {
    const singletonA = new CRDTSingleton<string>();
    singletonA.applyOperation({
      type: SingletonOpTypes.Set,
      value: '1',
      actor: 'A',
      clock: new Map([['A', 1]]),
    });

    const singletonB = new CRDTSingleton<string>();
    singletonB.applyOperation({
      type: SingletonOpTypes.Set,
      value: '2',
      actor: 'B',
      clock: new Map([['B', 1]]),
    });

    const {modelChange, otherChange} = singletonA.merge(singletonB.getData());
    const newValues = new Map([
      ['1', new Map([['A', 1]])],
      ['2', new Map([['B', 1]])],
    ]);
    const newVersion = new Map([['A', 1], ['B', 1]]);
    if (modelChange.changeType === ChangeType.Model) {
      assert.deepEqual(
        modelChange.modelPostChange,
        {values: newValues, version: newVersion});
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Model');
    }
    assert.deepEqual(modelChange, otherChange);
    // '2' is also in the set now ('1' is returned because of lexicographical
    // sorting)
    assert.equal(singletonA.getParticleView(), '1');

    // A can now clear the new model.
    assert.isTrue(singletonA.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      clock: newVersion,
    }));
    assert.equal(singletonA.getParticleView(), null);
  });
});
