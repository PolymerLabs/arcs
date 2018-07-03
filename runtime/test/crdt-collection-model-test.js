// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from './chai-web.js';
import {CrdtCollectionModel} from '../storage/crdt-collection-model.js';

describe('crdt-collection-model', () => {
  it('can add values', async () => {
    let model = new CrdtCollectionModel();
    let effective = model.add('id', 'value', ['key1', 'key2']); 
    assert.isTrue(effective);
    assert.equal(model.size, 1);
    assert.equal(model.getValue('id'), 'value');
    assert.sameMembers(model.getKeys('id'), ['key1', 'key2']);
  });

  it('can remove values', async () => {
    let model = new CrdtCollectionModel();
    model.add('id', 'value', ['key1', 'key2']); 
    let effective = model.remove('id', ['key1', 'key2']); 
    assert.isTrue(effective);
    assert.equal(model.size, 0);
  });

  it('treats add with different keys as idempotent', async () => {
    let model = new CrdtCollectionModel();
    model.add('id', 'value', ['key1']); 
    let effective = model.add('id', 'value', ['key2']); 
    assert.isFalse(effective);
    assert.equal(model.size, 1);
    assert.equal(model.getValue('id'), 'value');
    assert.sameMembers(model.getKeys('id'), ['key1', 'key2']);
  });

  it('treats remove as idempotent', async () => {
    let model = new CrdtCollectionModel();
    model.add('id', 'value', ['key1', 'key2']); 
    model.remove('id', ['key1', 'key2']);
    let effective = model.remove('id', ['key1', 'key2']);
    assert.isFalse(effective);
  });

  it('doesnt treat value as removed until all keys are removed', async () => {
    let model = new CrdtCollectionModel();
    model.add('id', 'value', ['key1', 'key2']); 
    let effective = model.remove('id', ['key1']);
    assert.isFalse(effective);
    assert.equal(model.size, 1);
    assert.sameMembers(model.getKeys('id'), ['key2']);

    effective = model.remove('id', ['key2']);
    assert.isTrue(effective);
    assert.equal(model.size, 0);
  });

  it('allows a value to be updated', async () => {
    let model = new CrdtCollectionModel();
    model.add('id', 'value', ['key1', 'key2']); 
    let effective = model.add('id', 'value2', ['key3']);
    assert.isTrue(effective);
    assert.equal(model.getValue('id'), 'value2');
  });

  // TODO: break this test when we stop using dummy keys
  it('(should not) allow a value to be updated unless new keys are added', async () => {
    let model = new CrdtCollectionModel();
    model.add('id', 'value', ['key1', 'key2']); 
    let effective = model.add('id', 'value2', ['key1']);
    assert.isTrue(effective);
    assert.equal(model.getValue('id'), 'value2');
  });
});