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
import {Id, IdGenerator} from '../id.js';
import { Random } from '../random.js';

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

  describe('#createChildId', () => {
    let idGenerator: IdGenerator;

    beforeEach(() => {
      idGenerator = IdGenerator.createWithSessionIdForTesting('sessionId');
    });

    it('creates child IDs using its session ID', () => {
      const parentId = new Id('root');
      const childId = idGenerator.createChildId(parentId);
      assert.equal(childId.root, 'sessionId');
    });
    
    it('appends subcomponents when creating child IDs', () => {
      const parentId = new Id('root', ['x', 'y']);
      const childId = idGenerator.createChildId(parentId, 'z');
      assert.deepEqual(childId.idTree, ['x', 'y', 'z0']);
    });

    it('increments its counter', () => {
      const parentId = new Id('root', ['x', 'y']);
      assert.deepEqual(idGenerator.createChildId(parentId, 'z').idTree, ['x', 'y', 'z0']);
      assert.deepEqual(idGenerator.createChildId(parentId, 'z').idTree, ['x', 'y', 'z1']);
      assert.deepEqual(idGenerator.createChildId(parentId, 'z').idTree, ['x', 'y', 'z2']);
    });
  });
});

describe('Id', () => {
  it('parses IDs from strings with exclamation marks', () => {
    assert.deepEqual(Id.fromString('!root'), new Id('root'));
    assert.deepEqual(Id.fromString('!root:'), new Id('root'));
    assert.deepEqual(Id.fromString('!root:x:y'), new Id('root', ['x', 'y']));
  });

  it('parses IDs from strings without exclamation marks', () => {
    assert.deepEqual(Id.fromString('x'), new Id('',['x']));
    assert.deepEqual(Id.fromString('x:y'), new Id('', ['x', 'y']));
  });

  it('encodes to a string', () => {
    assert.equal(new Id('root').toString(), '!root:');
    assert.equal(new Id('root', ['x', 'y']).toString(), '!root:x:y');
  });

  it('encodes its ID tree', () => {
    assert.equal(new Id('root').idTreeAsString(), '');
    assert.equal(new Id('root', ['x', 'y']).idTreeAsString(), 'x:y');
  });
});