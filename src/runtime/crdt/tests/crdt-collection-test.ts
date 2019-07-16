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
    const set = new CRDTCollection<{id: string}>();
    assert.strictEqual(set.getParticleView().size, 0);
  });
  it('can add two different items from the same actor', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'two'},
      clock: {me: 2},
      actor: 'me'
    }));
    assert.sameMembers([...set.getParticleView()].map(a => a.id), ['one', 'two']);
  });
  it('can add the same value from two actors', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {them: 1},
      actor: 'them'
    });
    assert.sameMembers([...set.getParticleView()].map(a => a.id), ['one']);
  });
  it('rejects add operations not in sequence', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'two'},
      clock: {me: 0},
      actor: 'me'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'two'},
      clock: {me: 1},
      actor: 'me'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'two'},
      clock: {me: 3},
      actor: 'me'
    }));
  });
  it('can remove an item', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    }));
    assert.strictEqual(set.getParticleView().size, 0);
  });
  it('rejects remove operations if version mismatch', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'one'},
      clock: {me: 2},
      actor: 'me'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'one'},
      clock: {me: 0},
      actor: 'me'
    }));
  });
  it('rejects remove value not in collection', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'two'},
      clock: {me: 1},
      actor: 'me'
    }));
  });
  it('rejects remove version too old', () => {
    const set = new CRDTCollection<{id: string}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'two'},
      clock: {you: 1},
      actor: 'you'
    });
    // This succeeds because the op clock is up to date wrt to the value "one" (whose version is me:1).
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'one'},
      clock: {me: 1},
      actor: 'them'
    }));
    // This fails because the op clock is not up to date wrt to the actor "you" (whose version is you:1).
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'two'},
      clock: {me: 1},
      actor: 'them'
    }));
  });
  it('can merge two models', () => {
    const set1 = new CRDTCollection<{id: string}>();
    set1.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {me: 1},
      actor: 'me'
    });
    set1.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'two'},
      clock: {me: 2},
      actor: 'me'
    });
    const set2 = new CRDTCollection<{id: string}>();
    set2.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'three'},
      clock: {you: 1},
      actor: 'you'
    });
    set2.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one'},
      clock: {you: 2},
      actor: 'you'
    });
    const {modelChange, otherChange} = set1.merge(set2.getData());
    const expectedValues = {
      one: {value: {id: 'one'}, version: {me: 1, you: 2}},
      two: {value: {id: 'two'}, version: {me: 2}},
      three: {value: {id: 'three'}, version: {you: 1}}
    };
    if (modelChange.changeType === ChangeType.Model) {
      assert.deepEqual(
          modelChange.modelPostChange,
          {values: expectedValues, version: {you: 2, me: 2}});
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Model');
    }
    assert.deepEqual(modelChange, otherChange);

    // Test removes also work in merge.
    set1.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'one'},
      clock: {me: 2, you: 2},
      actor: 'me'
    });
    const {modelChange: modelChange2, otherChange: otherChange2} =
        set1.merge(set2.getData());
    const expectedValues2 = {
      two: {value: {id: 'two'}, version: {me: 2}},
      three: {value: {id: 'three'}, version: {you: 1}}
    };
    if (modelChange2.changeType === ChangeType.Model) {
      assert.deepEqual(
          modelChange2.modelPostChange,
          {values: expectedValues2, version: {you: 2, me: 2}});
    } else {
      assert.fail('modelChange.changeType should be ChangeType.Model');
    }
    assert.deepEqual(modelChange2, otherChange2);
  });
});

// Note: if/when adding more tests to this file, please, also update CollectionDataTest.java
