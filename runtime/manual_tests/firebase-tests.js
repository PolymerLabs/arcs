/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {Arc} from '../arc.js';
import {Manifest} from '../manifest.js';
import {Type} from '../type.js';
import {assert} from '../test/chai-web.js';
import {resetStorageForTesting} from '../storage/firebase-storage.js';

const testUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/firebase-storage-test';

describe('firebase', function() {
  before(async () => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    await resetStorageForTesting(testUrl);
  });
  it('can host a variable', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        Text value
    `);
    let arc = new Arc({id: 'test'});
    let storage = new StorageProviderFactory(arc.id);
    let BarType = Type.newEntity(manifest.schemas.Bar);
    let value = 'Hi there' + Math.random();
    let variable = await storage.construct('test0', BarType, `${testUrl}/test-variable`);
    await variable.set({id: 'test0:test', value});
    let result = await variable.get();
    assert.equal(value, result.value);
  }).timeout(10000);

  it('can host a collection', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        Text value
    `);
    let arc = new Arc({id: 'test'});
    let storage = new StorageProviderFactory(arc.id);
    let BarType = Type.newEntity(manifest.schemas.Bar);
    let value1 = 'Hi there' + Math.random();
    let value2 = 'Goodbye' + Math.random();
    let collection = await storage.construct('test1', BarType.collectionOf(), `${testUrl}/test-collection`);
    await collection.store({id: 'test0:test0', value: value1}, ['key0']);
    await collection.store({id: 'test0:test1', value: value2}, ['key1']);
    let result = await collection.get('test0:test0');
    assert.equal(value1, result.value);
    result = await collection.toList();
    assert.lengthOf(result, 2);
    assert(result[0].value = value1);
    assert(result[0].id = 'test0:test0');
    assert(result[1].value = value2);
    assert(result[1].id = 'test1:test1');
  }).timeout(10000);
});
