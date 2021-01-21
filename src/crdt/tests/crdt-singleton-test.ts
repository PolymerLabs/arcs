/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {ChangeType, CRDTSingleton, SingletonOpTypes} from '../lib-crdt.js';

describe('CRDTSingleton', () => {
  it('can set values from a single actor', () => {
    const singleton = new CRDTSingleton<{id: string}>();
    assert.strictEqual(singleton.getParticleView(), null);

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '1'},
      actor: 'A',
      versionMap: {A: 1},
    });
    assert.deepEqual(singleton.getParticleView(), {id: '1'});

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '2'},
      actor: 'A',
      versionMap: {A: 2},
    });
    assert.deepEqual(singleton.getParticleView(), {id: '2'});

    // Set requires version increment, so this fails.
    assert.isFalse(singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '3'},
      actor: 'A',
      versionMap: {A: 2},
    }));
    assert.deepEqual(singleton.getParticleView(), {id: '2'});
  });

  it('can clear values', () => {
    const singleton = new CRDTSingleton<{id: string}>();
    assert.strictEqual(singleton.getParticleView(), null);

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '1'},
      actor: 'A',
      versionMap: {A: 1},
    });
    assert.deepEqual(singleton.getParticleView(), {id: '1'});

    // Clear requires the same version number, so this does not really clear it.
    singleton.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      versionMap: {A: 0},
    });
    assert.deepEqual(singleton.getParticleView(), {id: '1'});
    singleton.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      versionMap: {A: 2},
    });
    assert.deepEqual(singleton.getParticleView(), {id: '1'});

    // Up-to-date version number, does clear it.
    singleton.applyOperation(
      {type: SingletonOpTypes.Clear, actor: 'A', versionMap: {A: 1}});
    assert.strictEqual(singleton.getParticleView(), null);
  });

  it('can add and clear from multiple actors', () => {
    const singleton = new CRDTSingleton<{id: string}>();
    assert.strictEqual(singleton.getParticleView(), null);

    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '1'},
      actor: 'A',
      versionMap: {A: 1},
    });
    assert.deepEqual(
      singleton.getData().values, {'1': {value: {id: '1'}, version: {A: 1}}});
    assert.deepEqual(singleton.getParticleView(), {id: '1'});

    // Another actor concurrently setting a value, both values will be kept.
    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '2'},
      actor: 'B',
      versionMap: {B: 1},
    });
    assert.deepEqual(
      singleton.getData().values,
      {'1': {value: {id: '1'}, version: {A: 1}}, '2': {value: {id: '2'}, version: {B: 1}}});
    assert.deepEqual(singleton.getParticleView(), {id: '1'});

    // Actor B setting a new value after also seeing A's value, old value is
    // removed.
    singleton.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '2'},
      actor: 'B',
      versionMap: {A: 1, B: 2},
    });
    assert.deepEqual(
      singleton.getData().values,
      {'2': {value: {id: '2'}, version: {A: 1, B: 2}}});
    assert.deepEqual(singleton.getParticleView(), {id: '2'});

    singleton.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      versionMap: {A: 1, B: 2}
    });
    assert.deepEqual(singleton.getData().values, {});
    assert.strictEqual(singleton.getParticleView(), null);
  });

  it('can merge two singletons', () => {
    const singletonA = new CRDTSingleton<{id: string}>();
    singletonA.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '1'},
      actor: 'A',
      versionMap: {A: 1},
    });

    const singletonB = new CRDTSingleton<{id: string}>();
    singletonB.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '2'},
      actor: 'B',
      versionMap: {B: 1},
    });

    const {modelChange, otherChange} = singletonA.merge(singletonB.getData());
    const newValues = {'1': {value: {id: '1'}, version: {A: 1}}, '2': {value: {id: '2'}, version: {B: 1}}};
    const newVersion = {A: 1, B: 1};
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
    assert.deepEqual(singletonA.getParticleView(), {id: '1'});

    // A can now clear the new model.
    assert.isTrue(singletonA.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      versionMap: newVersion,
    }));
    assert.strictEqual(singletonA.getParticleView(), null);
  });

  it('can merge two equal singletons', () => {
    const singletonA = new CRDTSingleton<{id: string}>();
    singletonA.applyOperation({
      type: SingletonOpTypes.Set,
      value: {id: '1'},
      actor: 'A',
      versionMap: {A: 1},
    });

    const {modelChange, otherChange} = singletonA.merge(singletonA.getData());
    assert.deepEqual(modelChange, {changeType: ChangeType.Operations, operations: []});
    assert.deepEqual(otherChange, {changeType: ChangeType.Operations, operations: []});

    // A can now clear the new model.
    const newVersion = {A: 1, B: 1};
    assert.isTrue(singletonA.applyOperation({
      type: SingletonOpTypes.Clear,
      actor: 'A',
      versionMap: newVersion,
    }));
    assert.strictEqual(singletonA.getParticleView(), null);
  });
});
