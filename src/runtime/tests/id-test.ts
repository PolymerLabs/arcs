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
import {Id, IdGenerator, ArcId} from '../id.js';
import {Random} from '../random.js';

// Alias for the Id factory method. IdGenerators should usually be used to create new IDs, but doing so in these tests is cumbersome.
const createId = Id._newIdInternal;

describe('IdGenerator', () => {
  describe('#newSession', () => {
    it('should generate a random session ID', () => {
      const randomValue = 0.5;
      const oldRandomNext = Random.next;
      Random.next = () => randomValue;
  
      const idGenerator = IdGenerator.newSession();
  
      const sessionId = randomValue * 2 ** 50 + '';
      assert.strictEqual(idGenerator.currentSessionIdForTesting, sessionId);
      Random.next = oldRandomNext;
    });
  });

  describe('#newChildId', () => {
    let idGenerator: IdGenerator;

    beforeEach(() => {
      idGenerator = IdGenerator.createWithSessionIdForTesting('sessionId');
    });

    it('creates child IDs using its session ID', () => {
      const parentId = createId('root');
      const childId = idGenerator.newChildId(parentId);
      assert.strictEqual(childId.root, 'sessionId');
    });
    
    it('appends subcomponents when creating child IDs', () => {
      const parentId = createId('root', ['x', 'y']);
      const childId = idGenerator.newChildId(parentId, 'z');
      assert.deepEqual(childId.idTree, ['x', 'y', 'z0']);
    });

    it('increments its counter', () => {
      const parentId = createId('root', ['x', 'y']);
      assert.deepEqual(idGenerator.newChildId(parentId, 'z').idTree, ['x', 'y', 'z0']);
      assert.deepEqual(idGenerator.newChildId(parentId, 'z').idTree, ['x', 'y', 'z1']);
      assert.deepEqual(idGenerator.newChildId(parentId, 'z').idTree, ['x', 'y', 'z2']);
    });
  });

  describe('#newArcId', () => {
    it('creates a valid ArcId using its session ID', () => {
      const idGenerator = IdGenerator.createWithSessionIdForTesting('sessionId');
      const arcId = idGenerator.newArcId('foo');
      assert(arcId instanceof ArcId);
      assert.strictEqual(arcId.toString(), '!sessionId:foo');
    });
  });
});

describe('Id', () => {
  it('parses IDs from strings with exclamation marks', () => {
    assert.deepEqual(Id.fromString('!root'), createId('root'));
    assert.deepEqual(Id.fromString('!root:'), createId('root'));
    assert.deepEqual(Id.fromString('!root:x:y'), createId('root', ['x', 'y']));
  });

  it('parses IDs from strings without exclamation marks', () => {
    assert.deepEqual(Id.fromString('x'), createId('', ['x']));
    assert.deepEqual(Id.fromString('x:y'), createId('', ['x', 'y']));
  });

  it('encodes to a string', () => {
    assert.strictEqual(createId('root').toString(), '!root:');
    assert.strictEqual(createId('root', ['x', 'y']).toString(), '!root:x:y');
  });

  it('encodes its ID tree', () => {
    assert.strictEqual(createId('root').idTreeAsString(), '');
    assert.strictEqual(createId('root', ['x', 'y']).idTreeAsString(), 'x:y');
  });
});
