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
import {ChangeType, VersionMap, isEmptyChange} from '../crdt.js';
import {CollectionOpTypes, CRDTCollection, CollectionOperation, simplifyFastForwardOp} from '../crdt-collection.js';

/** Creates an Add operation. */
function addOp(id: string, actor: string, clock: VersionMap): CollectionOperation<{id: string}> {
  return {type: CollectionOpTypes.Add, added: {id}, clock, actor};
}

/** Creates an Remove operation. */
function removeOp(id: string, actor: string, clock: VersionMap): CollectionOperation<{id: string}> {
  return {type: CollectionOpTypes.Remove, removed: {id}, clock, actor};
}

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
  it('can add the same id twice keeping the first value', () => {
    const set = new CRDTCollection<{id: string, value: number}>();
    set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one', value: 1},
      clock: {me: 1},
      actor: 'me'
    });
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'one', value: 2},
      clock: {me: 2},
      actor: 'me'
    }));
    assert.sameMembers([...set.getParticleView()].map(a => a.value), [1]);
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

  it('allows removal by single actors who are up to date', () => {
    const set = new CRDTCollection<{id: string}>();
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'x'},
      clock: {a: 1},
      actor: 'a'
    }));
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'x'},
      clock: {a: 1},
      actor: 'a'
    }));
  });

  it('allows removal by actors who are up to date', () => {
    const set = new CRDTCollection<{id: string}>();
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'x'},
      clock: {a: 1},
      actor: 'a'
    }));
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'x'},
      clock: {c: 1},
      actor: 'c'
    }));
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'x'},
      clock: {a: 1, c: 1},
      actor: 'a'
    }));
    // This does not cause an update, as the removal has already been applied.
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'x'},
      clock: {a: 1, c: 1},
      actor: 'c'
    }));
  });

  it('refuses removal by actors who are not up to date', () => {
    const set = new CRDTCollection<{id: string}>();
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'x'},
      clock: {a: 1},
      actor: 'a'
    }));
    assert.isTrue(set.applyOperation({
      type: CollectionOpTypes.Add,
      added: {id: 'x'},
      clock: {c: 1},
      actor: 'c'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'x'},
      clock: {a: 1},
      actor: 'a'
    }));
    assert.isFalse(set.applyOperation({
      type: CollectionOpTypes.Remove,
      removed: {id: 'x'},
      clock: {c: 1},
      actor: 'c'
    }));
  });

  it('rejects values with missing IDs', () => {
    const set = new CRDTCollection<{id: string}>();

    const valuesWithMissingIDs: {id: string}[] = [
      {} as {id: string},
      {id: null},
      {id: ''},
    ];
    valuesWithMissingIDs.forEach(value => {
      assert.throws(
          () => set.applyOperation({type: CollectionOpTypes.Add, added: value, actor: 'a', clock: {a: 1}}),
          'CRDT value must have an ID.');
      assert.throws(
          () => set.applyOperation({type: CollectionOpTypes.Remove, removed: value, actor: 'a', clock: {a: 1}}),
          'CRDT value must have an ID.');
    });
  });

  it('can merge two models', () => {
    // Original set of data common to both sets. Say that actor c added them all.
    const originalOps = [
      addOp('kept by both', 'c', {c: 1}),
      addOp('removed by a', 'c', {c: 2}),
      addOp('removed by b', 'c', {c: 3}),
      addOp('removed by a added by b', 'c', {c: 4}),
      addOp('removed by b added by a', 'c', {c: 5}),
    ];

    const set1 = new CRDTCollection<{id: string}>();
    const set2 = new CRDTCollection<{id: string}>();

    originalOps.forEach(op => assert.isTrue(set1.applyOperation(op)));
    originalOps.forEach(op => assert.isTrue(set2.applyOperation(op)));

    assert.isTrue(set1.applyOperation(removeOp('removed by a', 'a', {a: 0, c: 5})));
    assert.isTrue(set1.applyOperation(addOp('added by a', 'a', {a: 1, c: 5})));
    assert.isTrue(set1.applyOperation(addOp('added by both', 'a', {a: 2, c: 5})));
    assert.isTrue(set1.applyOperation(addOp('removed by b added by a', 'a', {a: 3, c: 5})));
    assert.isTrue(set1.applyOperation(removeOp('removed by a added by b', 'a', {a: 3, c: 5})));

    assert.isTrue(set2.applyOperation(addOp('added by both', 'b', {b: 1, c: 5})));
    assert.isTrue(set2.applyOperation(addOp('added by b', 'b', {b: 2, c: 5})));
    assert.isTrue(set2.applyOperation(removeOp('removed by b', 'b', {b: 2, c: 5})));
    assert.isTrue(set2.applyOperation(removeOp('removed by b added by a', 'b', {b: 2, c: 5})));
    assert.isTrue(set2.applyOperation(addOp('removed by a added by b', 'b', {b: 3, c: 5})));

    const {modelChange, otherChange} = set1.merge(set2.getData());

    const expectedVersion = {a: 3, b: 3, c: 5};
    assert.deepEqual(modelChange, {
      changeType: ChangeType.Model,
      modelPostChange: {
        values: {
          'kept by both': {value: {id: 'kept by both'}, version: {c: 1}},
          'removed by a added by b': {value: {id: 'removed by a added by b'}, version: {b: 3, c: 5}},
          'removed by b added by a': {value: {id: 'removed by b added by a'}, version: {a: 3, c: 5}},
          'added by a': {value: {id: 'added by a'}, version: {a: 1, c: 5}},
          'added by b': {value: {id: 'added by b'}, version: {b: 2, c: 5}},
          'added by both': {value: {id: 'added by both'}, version: {a: 2, b: 1, c: 5}},
        },
        version: expectedVersion
      },
    });
    if (otherChange.changeType === ChangeType.Operations) {
      assert.deepEqual(otherChange, {
        changeType: ChangeType.Operations,
        operations: [{
          type: CollectionOpTypes.FastForward,
          added: [
            [{id: 'added by both'}, {a: 2, b: 1, c: 5}],
            [{id: 'removed by b added by a'}, {a: 3, c: 5}],
            [{id: 'added by a'}, {a: 1, c: 5}],
          ],
          removed: [
            {id: 'removed by a'},
          ],
          oldClock: {b: 3, c: 5},
          newClock: expectedVersion,
        }],
      });
      assert.isTrue(set2.applyOperation(otherChange.operations[0]));
      if (modelChange.changeType === ChangeType.Model) {
        assert.deepEqual(set2.getData(), modelChange.modelPostChange);
      } else {
        assert.fail('Expected modelChange.changeType to be ChangeType.Model');
      }
    } else {
      assert.fail('Expected otherChange.changeType to be ChangeType.Operations');
    }
  });

  it('can merge additions by two actors', () => {
    const set1 = new CRDTCollection<{id: string}>();
    const set2 = new CRDTCollection<{id: string}>();
    assert.isTrue(set1.applyOperation(addOp('added by a', 'a', {a: 1})));
    assert.isTrue(set2.applyOperation(addOp('added by b', 'b', {b: 1})));

    const {modelChange, otherChange} = set1.merge(set2.getData());

    const expectedVersion = {a: 1, b: 1};
    assert.deepEqual(modelChange, {
      changeType: ChangeType.Model,
      modelPostChange: {
        values: {
          'added by a': {value: {id: 'added by a'}, version: {a: 1}},
          'added by b': {value: {id: 'added by b'}, version: {b: 1}}
        },
        version: expectedVersion
      },
    });
    assert.deepEqual(otherChange, {
      changeType: ChangeType.Operations,
      operations: [{
        type: CollectionOpTypes.FastForward,
        added: [
          [{id: 'added by a'}, {a: 1}],
        ],
        removed: [],
        oldClock: {b: 1},
        newClock: expectedVersion,
      }],
    });
  });

  it('can simplify single-actor add ops in merges', () => {
    const set1 = new CRDTCollection<{id: string}>();
    const set2 = new CRDTCollection<{id: string}>();

    const originalOps = [
      addOp('zero', 'a', {a: 1}),
      addOp('one', 'b', {b: 1}),
    ];
    originalOps.forEach(op => assert.isTrue(set1.applyOperation(op)));
    originalOps.forEach(op => assert.isTrue(set2.applyOperation(op)));

    // Add a bunch of things to set2.
    const set2AddOps = [
      addOp('two', 'b', {a: 1, b: 2}),
      addOp('three', 'b', {a: 1, b: 3}),
      addOp('four', 'b', {a: 1, b: 4}),
      addOp('five', 'b', {a: 1, b: 5}),
    ];
    set2AddOps.forEach(op => assert.isTrue(set2.applyOperation(op)));

    const {modelChange, otherChange} = set2.merge(set1.getData());

    // Check that add ops are produced (not a fast-forward op).
    assert.deepEqual(otherChange, {
      changeType: ChangeType.Operations,
      operations: set2AddOps,
    });
  });

  describe('fast-forward operations', () => {
    it('rejects fast-forward ops which begin in the future', () => {
      const set = new CRDTCollection<{id: string}>();

      assert.isFalse(set.applyOperation({
        type: CollectionOpTypes.FastForward,
        added: [],
        removed: [],
        oldClock: {a: 5},  // > 0
        newClock: {a: 10},
      }));
    });

    it('accepts (but does not apply) fast-forward ops which end in the past', () => {
      const set = new CRDTCollection<{id: string}>();

      // Add some initial elements.
      assert.isTrue(set.applyOperation(addOp('one', 'me', {me: 1})));
      assert.isTrue(set.applyOperation(addOp('two', 'me', {me: 2})));
      assert.isTrue(set.applyOperation(addOp('three', 'me', {me: 3})));

      // Check it accepts the operation (returns true), but does not add the new
      // element.
      assert.isTrue(set.applyOperation({
        type: CollectionOpTypes.FastForward,
        added: [
          [{id: 'four'}, {me: 2}],
        ],
        removed: [],
        oldClock: {me: 1},
        newClock: {me: 2},  // < 3
      }));
      assert.doesNotHaveAnyKeys(set.getData().values, ['four']);
    });

    it('advances the clock', () => {
      const set = new CRDTCollection<{id: string}>();

      // Add some initial elements.
      assert.isTrue(set.applyOperation(addOp('one', 'a', {a: 1})));
      assert.isTrue(set.applyOperation(addOp('two', 'a', {a: 2})));
      assert.isTrue(set.applyOperation(addOp('three', 'b', {b: 1})));
      assert.isTrue(set.applyOperation(addOp('four', 'c', {c: 1})));
      assert.deepEqual(set.getData().version, {a: 2, b: 1, c: 1});

      assert.isTrue(set.applyOperation({
        type: CollectionOpTypes.FastForward,
        added: [],
        removed: [],
        oldClock: {a: 2, b: 1},
        newClock: {a: 27, b: 45},
      }));

      assert.deepEqual(set.getData().version, {a: 27, b: 45, c: 1});
    });

    it('can add elements', () => {
      const set = new CRDTCollection<{id: string}>();

      // Add some initial elements.
      assert.isTrue(set.applyOperation(addOp('one', 'a', {a: 1})));
      assert.isTrue(set.applyOperation(addOp('two', 'b', {b: 1})));

      // This is the point where the fast-forward was computed.
      assert.isTrue(set.applyOperation({
        type: CollectionOpTypes.FastForward,
        added: [
          [{id: 'one'}, {a: 1, b: 7}],
          [{id: 'four'}, {a: 1, b: 9}],
        ],
        removed: [],
        oldClock: {a: 1, b: 1},
        newClock: {a: 1, b: 9},
      }));

      // Model has since been updated.
      assert.isTrue(set.applyOperation(removeOp('two', 'a', {a: 1, b: 1})));
      assert.isTrue(set.applyOperation(addOp('three', 'a', {a: 2, b: 1})));

      // one should be merged with the new version, two was removed and
      // shouldn't be added back again, three was existing and shouldn't be
      // deleted, and four is new.
      assert.deepEqual(set.getData(), {
        values: {
          'one': {value: {id: 'one'}, version: {a: 1, b: 7}},      // Merged.
          'three': {value: {id: 'three'}, version: {a: 2, b: 1}},  // Existing.
          'four': {value: {id: 'four'}, version: {a: 1, b: 9}},    // Added.
        },
        version: {a: 2, b: 9},
      });
    });

    it('can remove elements', () => {
      const set = new CRDTCollection<{id: string}>();

      // Add some initial elements.
      assert.isTrue(set.applyOperation(addOp('one', 'a', {a: 1})));
      assert.isTrue(set.applyOperation(addOp('two', 'a', {a: 2})));
      assert.isTrue(set.applyOperation(addOp('three', 'b', {b: 1})));

      assert.isTrue(set.applyOperation({
        type: CollectionOpTypes.FastForward,
        added: [],
        removed: [
          {id: 'one'},
          {id: 'two'},
        ],
        oldClock: {a: 1, b: 1},
        newClock: {a: 1, b: 5},
      }));

      // one should be removed, but two should not, because it's version is not
      // dominated by newClock above.
      assert.hasAllKeys(set.getData().values, ['two', 'three']);
      assert.deepEqual(set.getData().version, {a: 2, b: 5});
    });
  });

  describe('simplifyFastForwardOp', () => {
    it(`simplifies single add op from a single actor`, () => {
      assert.deepEqual(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [[{id: 'one'}, {a: 2, b: 1}]],
        removed: [],
        oldClock: {a: 1, b: 1},
        newClock: {a: 2, b: 1},
      }), [{
        type: CollectionOpTypes.Add,
        added: {id: 'one'},
        actor: 'a',
        clock: {a: 2, b: 1},
      }]);
    });

    it(`simplifies multiple add ops from a single actor`, () => {
      assert.deepEqual(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [
          [{id: 'two'}, {a: 3, b: 1}],
          [{id: 'one'}, {a: 2, b: 1}],
        ],
        removed: [],
        oldClock: {a: 1, b: 1},
        newClock: {a: 3, b: 1},
      }), [
        {
          type: CollectionOpTypes.Add,
          added: {id: 'one'},
          actor: 'a',
          clock: {a: 2, b: 1},
        },
        {
          type: CollectionOpTypes.Add,
          added: {id: 'two'},
          actor: 'a',
          clock: {a: 3, b: 1},
        },
      ]);
    });

    it(`doesn't simplify remove ops`, () => {
      assert.isNull(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [],
        removed: [[{id: 'one'}, {a: 1}]],
        oldClock: {a: 1},
        newClock: {a: 1},
      }));
    });

    it(`doesn't simplify pure version bumps`, () => {
      assert.isNull(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [],
        removed: [],
        oldClock: {a: 1},
        newClock: {a: 5},
      }));
    });

    it(`doesn't simplify add ops from a single actor with version jumps`, () => {
      assert.isNull(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [
          [{id: 'one'}, {a: 1}],
          [{id: 'two'}, {a: 2}],
          [{id: 'four'}, {a: 4}],
        ],
        removed: [],
        oldClock: {a: 0},
        newClock: {a: 4},
      }));
    });

    it(`doesn't simplify add ops from multiple actors`, () => {
      assert.isNull(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [[{id: 'one'}, {a: 2, b: 2}]],
        removed: [],
        oldClock: {a: 1, b: 1},
        newClock: {a: 2, b: 2},
      }));
    });

    it(`doesn't simplify add ops with a version jump at the end`, () => {
      assert.isNull(simplifyFastForwardOp({
        type: CollectionOpTypes.FastForward,
        added: [[{id: 'one'}, {a: 2}]],
        removed: [],
        oldClock: {a: 1},
        newClock: {a: 3},  // Fails because it's > 2
      }));
    });

    it('returns an empty change when merging identical models', () => {
      const set = new CRDTCollection<{id: string}>();
      const {modelChange, otherChange} = set.merge(set.getData());
      assert.isTrue(isEmptyChange(modelChange));
      assert.isTrue(isEmptyChange(otherChange));

      set.applyOperation({type: CollectionOpTypes.Add, actor: 'a', added: {id: 'foo'}, clock: {'a': 1}});
      set.applyOperation({type: CollectionOpTypes.Add, actor: 'b', added: {id: 'bar'}, clock: {'a': 1, 'b': 1}});
      const {modelChange: modelChange2, otherChange: otherChange2} = set.merge(set.getData());
      assert.isTrue(isEmptyChange(modelChange2));
      assert.isTrue(isEmptyChange(otherChange2));

      const set2 = new CRDTCollection<{id: string}>();
      set2.merge(set.getData());

      set.applyOperation({type: CollectionOpTypes.Remove, actor: 'a', removed: {id: 'foo'}, clock: {'a': 1, 'b': 1}});
      set2.applyOperation({type: CollectionOpTypes.Remove, actor: 'a', removed: {id: 'bar'}, clock: {'a': 1, 'b': 1}});

      const {modelChange: modelChange3, otherChange: otherChange3} = set.merge(set2.getData());
      assert.isFalse(isEmptyChange(modelChange3));
      assert.isFalse(isEmptyChange(otherChange3));
    });
  });
});

// Note: if/when adding more tests to this file, please, also update CrdtTest.java
