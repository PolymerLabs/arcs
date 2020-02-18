/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../../platform/loader.js';
import {Manifest, ManifestHandleRetriever} from '../manifest.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, SingletonStorageProvider} from '../storage/storage-provider-base.js';
import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {resetVolatileStorageForTesting} from '../storage/volatile-storage.js';
import {EntityType, ReferenceType} from '../type.js';
import {Id, ArcId} from '../id.js';
import {Flags} from '../flags.js';

// Resolves when the two stores are synchronzied with each other:
// * same version
// * no pending changes
async function synchronized(store1, store2, delay=1) {
  while (store1._hasLocalChanges || store2._hasLocalChanges || store1.versionForTesting !== store2.versionForTesting) {
    await new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

describe('volatile', () => {

  const storeKey = 'volatile';

  before(() => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    resetVolatileStorageForTesting();
  });

  const newArc = async () => {
     const context = await Manifest.parse(`
       schema Bar
         value: Text
     `);
     const id = ArcId.newForTest('test');
     return {
         manifest: context,
         arc: new Arc({id, context, loader: new Loader()}),
         storage: new StorageProviderFactory(id, new ManifestHandleRetriever())
     };
   };

  describe('variable', () => {
    before(function() {
      if (Flags.useNewStorageStack) {
        this.skip();
      }
    });

    it('supports basic construct and mutate', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const value = 'Hi there' + Math.random();
      const variable = await storage.construct('test0', barType, storeKey) as SingletonStorageProvider;
      await variable.set({id: 'test0:test', value});
      const result = await variable.fetch();
      assert.strictEqual(value, result.value);
    });

    it('resolves concurrent set', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const var1 = await storage.construct('test0', barType, storeKey) as SingletonStorageProvider;
      const var2 = await storage.connect('test0', barType, var1.storageKey) as SingletonStorageProvider;
      await Promise.all([var1.set({id: 'id1', value: 'value1'}), var2.set({id: 'id2', value: 'value2'})]);
      assert.deepEqual(await var1.fetch(), await var2.fetch());
    });

    it('enables referenceMode by default', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);

      const var1 = await storage.construct('test0', barType, storeKey) as SingletonStorageProvider;
      await var1.set({id: 'id1', value: 'underlying'});

      const result = await var1.fetch();
      assert.strictEqual('underlying', result.value);

      assert.isTrue(var1.referenceMode);
      assert.isNotNull(var1.backingStore);

      assert.deepEqual(await var1.backingStore.fetchAll('id1'), await var1.fetch());
    });

    it('supports references', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);

      const var1 = await storage.construct('test0', new ReferenceType(barType), storeKey) as SingletonStorageProvider;
      await var1.set({id: 'id1', storageKey: 'underlying'});

      const result = await var1.fetch();
      assert.strictEqual('underlying', result.storageKey);

      assert.isFalse(var1.referenceMode);
      assert.isNull(var1.backingStore);
    });
  });


  describe('collection', () => {
    before(function() {
      if (Flags.useNewStorageStack) {
        this.skip();
      }
    });

    it('supports basic construct and mutate', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const value1 = 'Hi there' + Math.random();
      const value2 = 'Goodbye' + Math.random();
      const collection = await storage.construct('test1', barType.collectionOf(), storeKey) as CollectionStorageProvider;
      await collection.store({id: 'id0', value: value1}, ['key0']);
      await collection.store({id: 'id1', value: value2}, ['key1']);
      let result = await collection.fetchAll('id0');
      assert.strictEqual(value1, result.value);
      result = await collection.toList();
      assert.deepEqual(result, [{id: 'id0', value: value1}, {id: 'id1', value: value2}]);
    });
    it('resolves concurrent add of same id', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const collection1 = await storage.construct('test1', barType.collectionOf(), storeKey) as CollectionStorageProvider;
      const collection2 = await storage.connect('test1', barType.collectionOf(), collection1.storageKey) as CollectionStorageProvider;
      await collection1.store({id: 'id1', value: 'value'}, ['key1']);
      await collection2.store({id: 'id1', value: 'value'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.deepEqual(await collection1.toList(), await collection2.toList());
    });
    it('resolves concurrent add/remove of same id', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const collection1 = await storage.construct('test1', barType.collectionOf(), storeKey) as CollectionStorageProvider;
      const collection2 = await storage.connect('test1', barType.collectionOf(), collection1.storageKey) as CollectionStorageProvider;
      await collection1.store({id: 'id1', value: 'value'}, ['key1']);
      await collection2.store({id: 'id1', value: 'value'}, ['key2']);
      await collection1.remove('id1', ['key1']);
      await collection2.remove('id1', ['key2']);
      await synchronized(collection1, collection2);
      assert.isEmpty(await collection1.toList());
      assert.isEmpty(await collection2.toList());
    });
    it('resolves concurrent add of different id', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const collection1 = await storage.construct('test1', barType.collectionOf(), storeKey) as CollectionStorageProvider;
      const collection2 = await storage.connect('test1', barType.collectionOf(), collection1.storageKey) as CollectionStorageProvider;
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.lengthOf(await collection1.toList(), 2);
      assert.sameDeepMembers(await collection1.toList(), await collection2.toList());
    });
    it('enables referenceMode by default', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);

      const collection1 = await storage.construct('test0', barType.collectionOf(), storeKey) as CollectionStorageProvider;

      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', value: 'value2'}, ['key2']);

      let result = await collection1.fetchAll('id1');
      assert.strictEqual('value1', result.value);
      result = await collection1.fetchAll('id2');
      assert.strictEqual('value2', result.value);

      assert.isTrue(collection1.referenceMode);
      assert.isNotNull(collection1.backingStore);

      assert.deepEqual(await collection1.backingStore.toList(), await collection1.toList());
    });
    it('supports removeMultiple', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const collection = await storage.construct('test1', barType.collectionOf(), storeKey) as CollectionStorageProvider;
      await collection.store({id: 'id1', value: 'value'}, ['key1']);
      await collection.store({id: 'id2', value: 'value'}, ['key2']);
      await collection.removeMultiple([
        {id: 'id1', keys: ['key1']}, {id: 'id2', keys: ['key2']}
      ]);
      assert.isEmpty(await collection.toList());
    });
    it('supports references', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);

      const collection1 = await storage.construct('test0', new ReferenceType(barType).collectionOf(), storeKey) as CollectionStorageProvider;

      await collection1.store({id: 'id1', storageKey: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', storageKey: 'value2'}, ['key2']);

      let result = await collection1.fetchAll('id1');
      assert.strictEqual('value1', result.storageKey);
      result = await collection1.fetchAll('id2');
      assert.strictEqual('value2', result.storageKey);

      assert.isFalse(collection1.referenceMode);
      assert.isNull(collection1.backingStore);
    });
  });

  describe('big collection', () => {
    before(function() {
      if (Flags.useNewStorageStack) {
        this.skip();
      }
    });

    it('supports get, store and remove (including concurrently)', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const collection1 = await storage.construct('test0', barType.bigCollectionOf(), storeKey) as CollectionStorageProvider;
      const collection2 = await storage.connect('test0', barType.bigCollectionOf(), collection1.storageKey) as CollectionStorageProvider;

      // Concurrent writes to different ids.
      await Promise.all([
        collection1.store({id: 'id1', data: 'ab'}, ['k34']),
        collection2.store({id: 'id2', data: 'cd'}, ['k12'])
      ]);
      assert.strictEqual((await collection2.fetchAll('id1')).data, 'ab');
      assert.strictEqual((await collection1.fetchAll('id2')).data, 'cd');

      await collection1.remove('id2', ['key2']);
      assert.isNull(await collection2.fetchAll('id2'));

      // Concurrent writes to the same id.
      await Promise.all([
        collection1.store({id: 'id3', data: 'xx'}, ['k65']),
        collection2.store({id: 'id3', data: 'yy'}, ['k87'])
      ]);
      assert.include(['xx', 'yy'], (await collection1.fetchAll('id3')).data);

      assert.isNull(await collection1.fetchAll('non-existent'));
      await collection1.remove('non-existent', ['key1']);
    });

    async function checkNext(col, cid, ids) {
      const {value, done} = await col.cursorNext(cid);
      assert.isFalse(done);
      assert.strictEqual(value.length, ids.length);
      for (let i = 0; i < value.length; i++) {
        assert.strictEqual(value[i].id, ids[i]);
        assert.strictEqual(value[i].data, 'v' + ids[i]);
      }
    }

    async function checkDone(col, cid) {
      const {value, done} = await col.cursorNext(cid);
      assert.isTrue(done);
      assert.isUndefined(value);
    }

    it('supports version-stable streamed reads forwards', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const col = await storage.construct('test0', barType.bigCollectionOf(), storeKey) as BigCollectionStorageProvider;

      const ids = ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08', 'x09', 'o10'];
      for (let i = 0; i < ids.length; i++) {
        await col.store({id: ids[i], data: 'v' + ids[i]}, ['k' + ids[i]]);
      }

      // Re-store a couple of ids to change the insertion order of the collection's internal map
      // so we know the cursor is correctly ordering results based on the index.
      await col.store({id: 'p07', data: 'vp07'}, ['kXX']);
      await col.store({id: 'q04', data: 'vq04'}, ['kYY']);

      const cid1 = await col.stream(6);
      await checkNext(col, cid1, ['r01', 'i02', 'z03', 'h05', 'y06', 'g08']);

      await col.store({id: 'f11', data: 'vf11'}, ['kf11']);
      await col.remove('g08');
      await col.remove('z03');

      // Interleave another cursor at a different version.
      const cid2 = await col.stream(20);
      assert.strictEqual(col.cursorVersion(cid2), col.cursorVersion(cid1) + 3);
      await checkNext(col, cid2, ['r01', 'i02', 'h05', 'y06', 'x09', 'o10', 'p07', 'q04', 'f11']);

      await checkNext(col, cid1, ['x09', 'o10', 'p07', 'q04']);
      await checkDone(col, cid1);
      await checkDone(col, cid2);

      // Verify close().
      const cid3 = await col.stream(3);
      await checkNext(col, cid3, ['r01', 'i02', 'h05']);
      col.cursorClose(cid3);
      await checkDone(col, cid3);
    });

    it('supports version-stable streamed reads backwards', async () => {
      const {manifest, arc, storage} = await newArc();
      const barType = new EntityType(manifest.schemas.Bar);
      const col = await storage.construct('test0', barType.bigCollectionOf(), storeKey) as BigCollectionStorageProvider;

      const ids = ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08', 'x09', 'o10'];
      for (let i = 0; i < ids.length; i++) {
        await col.store({id: ids[i], data: 'v' + ids[i]}, ['k' + ids[i]]);
      }

      // Re-store a couple of ids to change the insertion order of the collection's internal map
      // so we know the cursor is correctly ordering results based on the index.
      await col.store({id: 'p07', data: 'vp07'}, ['kXX']);
      await col.store({id: 'q04', data: 'vq04'}, ['kYY']);

      const cid1 = await col.stream(6, false);
      await checkNext(col, cid1, ['q04', 'p07', 'o10', 'x09', 'g08', 'y06']);

      await col.store({id: 'f11', data: 'vf11'}, ['kf11']);
      await col.remove('y06');
      await col.remove('o10');

      // Interleave another cursor at a different version.
      const cid2 = await col.stream(20, false);
      assert.strictEqual(col.cursorVersion(cid2), col.cursorVersion(cid1) + 3);
      await checkNext(col, cid2, ['f11', 'q04', 'p07', 'x09', 'g08', 'h05', 'z03', 'i02', 'r01']);

      await checkNext(col, cid1, ['h05', 'z03', 'i02', 'r01']);
      await checkDone(col, cid1);
      await checkDone(col, cid2);

      // Verify close().
      const cid3 = await col.stream(3, false);
      await checkNext(col, cid3, ['f11', 'q04', 'p07']);
      col.cursorClose(cid3);
      await checkDone(col, cid3);
    });
  });
});
