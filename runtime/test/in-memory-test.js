/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProviderFactory} from '../ts-build/storage/storage-provider-factory.js';
import {Arc} from '../arc.js';
import {Manifest} from '../manifest.js';
import {Type} from '../ts-build/type.js';
import {assert} from '../test/chai-web.js';
import {resetInMemoryStorageForTesting} from '../ts-build/storage/in-memory-storage.js';

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
      await Promise.all([var1.set({id: 'id1', value: 'value1'}), var2.set({id: 'id2', value: 'value2'})]);
      assert.deepEqual(await var1.get(), await var2.get());
    });

    it('enables referenceMode by default', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');
  
      let var1 = await storage.construct('test0', BarType, key1);
      await var1.set({id: 'id1', value: 'underlying'});
      
      let result = await var1.get();
      assert.equal('underlying', result.value);

      assert.isTrue(var1.referenceMode);
      assert.isNotNull(var1.backingStore);

      assert.deepEqual(await var1.backingStore.get('id1'), await var1.get());
    });

    it('supports references', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');

      let var1 = await storage.construct('test0', Type.newReference(BarType), key1);
      await var1.set({id: 'id1', storageKey: 'underlying'});
      
      let result = await var1.get();
      assert.equal('underlying', result.storageKey);

      assert.isFalse(var1.referenceMode);
      assert.isNull(var1.backingStore);
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
    it('enables referenceMode by default', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');
  
      let collection1 = await storage.construct('test0', BarType.collectionOf(), key1);
  
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', value: 'value2'}, ['key2']);
      
      let result = await collection1.get('id1');
      assert.equal('value1', result.value);
      result = await collection1.get('id2');
      assert.equal('value2', result.value);

      assert.isTrue(collection1.referenceMode);
      assert.isNotNull(collection1.backingStore);

      assert.deepEqual(await collection1.backingStore.toList(), await collection1.toList());
    });
    it('supports references', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
  
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');
  
      let collection1 = await storage.construct('test0', Type.newReference(BarType).collectionOf(), key1);
  
      await collection1.store({id: 'id1', storageKey: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', storageKey: 'value2'}, ['key2']);
      
      let result = await collection1.get('id1');
      assert.equal('value1', result.storageKey);
      result = await collection1.get('id2');
      assert.equal('value2', result.storageKey);

      assert.isFalse(collection1.referenceMode);
      assert.isNull(collection1.backingStore);
    }); 
  });

  describe('big collection', () => {
    it('supports get, store and remove (including concurrently)', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text data
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('bigcollection');
      let collection1 = await storage.construct('test0', BarType.bigCollectionOf(), key);
      let collection2 = await storage.connect('test0', BarType.bigCollectionOf(), collection1.storageKey);

      // Concurrent writes to different ids.
      await Promise.all([
        collection1.store({id: 'id1', data: 'ab'}, ['k34']),
        collection2.store({id: 'id2', data: 'cd'}, ['k12'])
      ]);
      assert.equal((await collection2.get('id1')).data, 'ab');
      assert.equal((await collection1.get('id2')).data, 'cd');

      await collection1.remove('id2');
      assert.isNull(await collection2.get('id2'));

      // Concurrent writes to the same id.
      await Promise.all([
        collection1.store({id: 'id3', data: 'xx'}, ['k65']),
        collection2.store({id: 'id3', data: 'yy'}, ['k87'])
      ]);
      assert.include(['xx', 'yy'], (await collection1.get('id3')).data);

      assert.isNull(await collection1.get('non-existent'));
      await collection1.remove('non-existent');
    });

    it('supports version-stable streamed reads', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text data
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('bigcollection');
      let collection = await storage.construct('test0', BarType.bigCollectionOf(), key);

      let ids = ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08', 'x09', 'o10'];
      for (let i = 0; i < ids.length; i++) {
        await collection.store({id: ids[i], data: 'v' + ids[i]}, ['k' + ids[i]]);
      }

      // Re-store a couple of ids to change the insertion order of the collection's internal map
      // so we know the cursor is correctly ordering results based on the index.
      await collection.store({id: 'p07', data: 'vp07'}, ['kXX']);
      await collection.store({id: 'q04', data: 'vq04'}, ['kYY']);

      let checkNext = async (cursor, ids) => {
        let {value, done} = await cursor.next();
        assert.isFalse(done);
        assert.equal(value.length, ids.length);
        for (let i = 0; i < value.length; i++) {
          assert.equal(value[i].id, ids[i]);
          assert.equal(value[i].data, 'v' + ids[i]);
        }
      };

      let checkDone = async cursor => {
        let {value, done} = await cursor.next();
        assert.isTrue(done);
        assert.isUndefined(value);
      };

      let cursor1 = await collection.stream(6);
      await checkNext(cursor1, ['r01', 'i02', 'z03', 'h05', 'y06', 'g08']);

      await collection.store({id: 'f11', data: 'vf11'}, ['kf11']);
      await collection.remove('g08');
      await collection.remove('z03');

      // Interleave another cursor at a different version.
      let cursor2 = await collection.stream(20);
      assert.equal(cursor2.version, cursor1.version + 3);
      await checkNext(cursor2, ['r01', 'i02', 'h05', 'y06', 'x09', 'o10', 'p07', 'q04', 'f11']);
      
      await checkNext(cursor1, ['x09', 'o10', 'p07', 'q04']);
      await checkDone(cursor1);
      await checkDone(cursor2);

      // Verify close().
      let cursor3 = await collection.stream(3);
      await checkNext(cursor3, ['r01', 'i02', 'h05']);
      await cursor3.close();
      await checkDone(cursor3);
    });
  });
});
