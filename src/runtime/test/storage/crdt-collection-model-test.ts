// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/chai-web.js';
import {CrdtCollectionModel, ModelValue} from '../../storage/crdt-collection-model.js';

describe('crdt-collection-model', () => {
  it('can add values', async () => {
    const value: ModelValue = {id: 'id', rawData: {rawvalue: 1}};
    const model = new CrdtCollectionModel();
    const effective = model.add('id', value, ['key1', 'key2']);
    assert.isTrue(effective);
    assert.equal(model.size, 1);
    assert.equal(model.getValue('id'), value);
    assert.sameMembers(model.getKeys('id'), ['key1', 'key2']);
  });
  it('can remove values', async () => {
    const model = new CrdtCollectionModel();
    const value: ModelValue = {id: 'id', rawData: {rawvalue: 1}};
    model.add('id', value, ['key1', 'key2']);
    const effective = model.remove('id', ['key1', 'key2']);
    assert.isTrue(effective);
    assert.equal(model.size, 0);
  });
  it('treats add with different keys as idempotent', async () => {
    const value: ModelValue = {id: 'id', rawData: {rawValue: 1}};
    const model = new CrdtCollectionModel();
    model.add('id', value, ['key1']);
    const effective = model.add('id', value, ['key2']);
    assert.isFalse(effective);
    assert.equal(model.size, 1);
    assert.equal(model.getValue('id'), value);
    assert.sameMembers(model.getKeys('id'), ['key1', 'key2']);
  });
  it('treats remove as idempotent', async () => {
    const model = new CrdtCollectionModel();
    const value: ModelValue = {id: 'id', rawData: {rawValue: 1}};
    model.add('id', value, ['key1', 'key2']);
    model.remove('id', ['key1', 'key2']);
    const effective = model.remove('id', ['key1', 'key2']);
    assert.isFalse(effective);
  });
  it('doesnt treat value as removed until all keys are removed', async () => {
    const model = new CrdtCollectionModel();
    const value: ModelValue = {id: 'id', rawData: {rawValue: 1}};
    model.add('id', value, ['key1', 'key2']);
    let effective = model.remove('id', ['key1']);
    assert.isFalse(effective);
    assert.equal(model.size, 1);
    assert.sameMembers(model.getKeys('id'), ['key2']);
    effective = model.remove('id', ['key2']);
    assert.isTrue(effective);
    assert.equal(model.size, 0);
  });
  it('allows a value to be updated', async () => {
    const value1: ModelValue = {id: 'id1', rawData: {rawValue: 1}};
    const value2: ModelValue = {id: 'id2', rawData: {rawValue: 2}};

    const model = new CrdtCollectionModel();
    model.add('id', value1, ['key1', 'key2']);
    const effective = model.add('id', value2, ['key3']);
    assert.isTrue(effective);
    assert.equal(model.getValue('id'), value2);
  });
  it('does not allow a value to be updated unless new keys are added', async () => {
    const model = new CrdtCollectionModel();
    const value: ModelValue = {id: 'id', rawData: {rawValue: 1}};
    model.add('id', value, ['key1', 'key2']);
    assert.throws(() => model.add('id', {id: 'id2', rawData: {rawValue: 2}}, ['key1']), /cannot add without new keys/);
  });
  it('does not allow a value to be added without keys', async () => {
    const model = new CrdtCollectionModel();
    const value: ModelValue = {id: 'id', rawData: {rawValue: 1}};
    assert.throws(() => model.add('id', value, []), /add requires a list of keys/);
  });
  it('allows keys to be initialized empty', async () => {
    const model = new CrdtCollectionModel([
      {id: 'nokeys', value: {id: 'id', rawData: {rawValue: 1}}, keys: []},
      {id: 'keys', value: {id: 'id', rawData: {rawValue: 2}}, keys: ['key1']},
    ]);
    assert.equal(model.size, 2);
    assert.isEmpty(model.getKeys('nokeys'));
    assert.sameMembers(model.getKeys('keys'), ['key1']);
    const effective = model.remove('nokeys', []);
    assert.isTrue(effective);
    assert.equal(model.size, 1);
  });
});
