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
      const oldRandom = Random;
      Random.next = () => 123;
  
      const idGenerator = IdGenerator.newSession();
  
      const sessionId = 123 * 2 ** 50 + '';
      assert.equal(idGenerator.currentSessionIdForTesting, sessionId);
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
      assert.equal(childId.root, 'sessionId');
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
      assert.equal(arcId.toString(), '!sessionId:foo');
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
    assert.deepEqual(Id.fromString('x'), createId('',['x']));
    assert.deepEqual(Id.fromString('x:y'), createId('', ['x', 'y']));
  });

  it('encodes to a string', () => {
    assert.equal(createId('root').toString(), '!root:');
    assert.equal(createId('root', ['x', 'y']).toString(), '!root:x:y');
  });

  it('encodes its ID tree', () => {
    assert.equal(createId('root').idTreeAsString(), '');
    assert.equal(createId('root', ['x', 'y']).idTreeAsString(), 'x:y');
  });
});