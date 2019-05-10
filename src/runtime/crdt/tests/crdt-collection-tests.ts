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
import {CollectionOpTypes, CRDTCollection} from '../crdt-collection';

describe('CRDTCollection', () => {
  it('initially is empty', () => {
    const set = new CRDTCollection<string>();
    assert.equal(set.getParticleView().size, 0);
  });
  it('can add two different items from the same actor', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'two',
      clock: new Map([['me', 2]]),
      actor: 'me'
    }));
    assert.sameMembers([...set.getParticleView()], ['one', 'two']);
  });
  it('can add the same value from two actors', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['them', 1]]),
      actor: 'them'
    });
    assert.sameMembers([...set.getParticleView()], ['one']);
  });
  it('rejects add operations not in sequence', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'two',
      clock: new Map([['me', 0]]),
      actor: 'me'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'two',
      clock: new Map([['me', 1]]),
      actor: 'me'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'two',
      clock: new Map([['me', 3]]),
      actor: 'me'
    }));
  });
  it('can remove an item', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    }));
    assert.equal(set.getParticleView().size, 0);
  });
  it('rejects remove operations if version mismatch', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'one',
      clock: new Map([['me', 2]]),
      actor: 'me'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'one',
      clock: new Map([['me', 0]]),
      actor: 'me'
    }));
  });
  it('rejects remove value not in collection', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'two',
      clock: new Map([['me', 1]]),
      actor: 'me'
    }));
  });
  it('rejects remove version too old', () => {
    const set = new CRDTCollection<string>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'two',
      clock: new Map([['you', 1]]),
      actor: 'you'
    });
    // This succeeds because the op clock is up to date wrt to the value "one" (whose version is me:1).
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'one',
      clock: new Map([['me', 1]]),
      actor: 'them'
    }));
    // This fails because the op clock is not up to date wrt to the actor "you" (whose version is you:1).
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'two',
      clock: new Map([['me', 1]]),
      actor: 'them'
    }));
  });
  it('can merge two models', () => {
    const set1 = new CRDTCollection<string>();
    set1.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['me', 1]]),
      actor: 'me'
    });
    set1.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'two',
      clock: new Map([['me', 2]]),
      actor: 'me'
    });
    const set2 = new CRDTCollection<string>();
    set2.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'three',
      clock: new Map([['you', 1]]),
      actor: 'you'
    });
    set2.applyOperation({
      type: CollectionOpTypes.Add,
      added: 'one',
      clock: new Map([['you', 2]]),
      actor: 'you'
    });
    const {modelChange, otherChange} = set1.merge(set2.getData());
    const expectedValues = new Map([
      ['one', new Map([['me', 1], ['you', 2]])],
      ['two', new Map([['me', 2]])],
      ['three', new Map([['you', 1]])],
    ]);
    if (modelChange.changeType === ChangeType.Model) {
      assert.deepEqual(
          modelChange.modelPostChange,
          {values: expectedValues, version: new Map([['you', 2], ['me', 2]])});
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Model');
    }
    assert.deepEqual(modelChange, otherChange);

    // Test removes also work in merge.
    set1.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: 'one',
      clock: new Map([['me', 2], ['you', 2]]),
      actor: 'me'
    });
    const {modelChange: modelChange2, otherChange: otherChange2} =
        set1.merge(set2.getData());
    const expectedValues2 = new Map([
      ['two', new Map([['me', 2]])],
      ['three', new Map([['you', 1]])],
    ]);
    if (modelChange2.changeType === ChangeType.Model) {
      assert.deepEqual(
          modelChange2.modelPostChange,
          {values: expectedValues2, version: new Map([['you', 2], ['me', 2]])});
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Model');
    }
    assert.deepEqual(modelChange2, otherChange2);
  });
});
