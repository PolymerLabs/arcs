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
import {resetInMemoryStorageForTesting} from '../storage/in-memory-storage.js';

// Resolves when the two stores are synchronzied with each other:
// * same version
// * no pending changes
async function synchronized(store1, store2, delay=1) {
  while (store1._hasLocalChanges || store2._hasLocalChanges || store1.versionForTesting != store2.versionForTesting) {
    await new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

describe('in-memory', function() {

  let lastStoreId = 0;
  function newStoreKey(name) {
    return `in-memory`;
  }

  before(() => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    resetInMemoryStorageForTesting();
  });

  describe('variable', () => {
    it('supports basic construct and mutate', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let value = 'Hi there' + Math.random();
      let variable = await storage.construct('test0', BarType, newStoreKey('variable'));
      await variable.set({id: 'test0:test', value});
      let result = await variable.get();
      assert.equal(value, result.value);
    });

    it('resolves concurrent set', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('variable');
      let var1 = await storage.construct('test0', BarType, key);
      let var2 = await storage.connect('test0', BarType, var1.storageKey);
      var1.set({id: 'id1', value: 'value1'});
      var2.set({id: 'id2', value: 'value2'});
      await synchronized(var1, var2);
      assert.deepEqual(await var1.get(), await var2.get());
    });

    it('supports pointer dereferences', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');
      let key2 = newStoreKey('variableBase');

      let var1 = await storage.construct('test0', Type.newReference(BarType), key1);
      let var2 = await storage.construct('test1', BarType, key2);
      var1.set({id: 'id1', storageKey: var2.storageKey});
      var2.set({id: 'id1', value: 'underlying'});
      
      let result = await var1.get();
      assert.equal('underlying', result.value);
    });
  });

  describe('collection', () => {
    it('supports basic construct and mutate', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let value1 = 'Hi there' + Math.random();
      let value2 = 'Goodbye' + Math.random();
      let collection = await storage.construct('test1', BarType.collectionOf(), newStoreKey('collection'));
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
    });
    it('resolves concurrent add of same id', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      let collection2 = await storage.connect('test1', BarType.collectionOf(), collection1.storageKey);
      collection1.store({id: 'id1', value: 'value'}, ['key1']);
      await collection2.store({id: 'id1', value: 'value'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.deepEqual(await collection1.toList(), await collection2.toList());
    });
    it('resolves concurrent add/remove of same id', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      let collection2 = await storage.connect('test1', BarType.collectionOf(), collection1.storageKey);
      collection1.store({id: 'id1', value: 'value'}, ['key1']);
      collection2.store({id: 'id1', value: 'value'}, ['key2']);
      collection1.remove('id1', ['key1']);
      collection2.remove('id1', ['key2']);
      await synchronized(collection1, collection2);
      assert.isEmpty(await collection1.toList());
      assert.isEmpty(await collection2.toList());
    });
    it('resolves concurrent add of different id', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      let collection2 = await storage.connect('test1', BarType.collectionOf(), collection1.storageKey);
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.lengthOf(await collection1.toList(), 2);
      assert.sameDeepMembers(await collection1.toList(), await collection2.toList());
    });
    it('supports pointer dereferences', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
  
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');
      let key2 = newStoreKey('variableBase');
  
      let collection1 = await storage.construct('test0', Type.newReference(BarType).collectionOf(), key1);
      let collection2 = await storage.construct('test1', BarType.collectionOf(), key2);
  
      await collection1.store({id: 'id1', storageKey: collection2.storageKey}, ['key1']);
      await collection1.store({id: 'id2', storageKey: collection2.storageKey}, ['key2']);
  
      await collection2.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
      
      let result = await collection1.get('id1');
      assert.equal('value1', result.value);
      result = await collection1.get('id2');
      assert.equal('value2', result.value);
      result = await collection1.toList();
      assert.sameDeepMembers(result, await collection2.toList());
    }); 
  });
});
