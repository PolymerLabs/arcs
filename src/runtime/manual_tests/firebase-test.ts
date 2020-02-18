/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import '../storage/firebase/firebase-provider.js';
import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Id, ArcId} from '../id.js';
import {Loader} from '../../platform/loader.js';
import {Manifest, ManifestHandleRetriever} from '../manifest.js';
import {Runtime} from '../runtime.js';
import {EntityType, ReferenceType} from '../type.js';
import {resetStorageForTesting} from '../storage/firebase/firebase-storage.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, SingletonStorageProvider} from '../storage/storage-provider-base.js';
import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {SlotComposer} from '../slot-composer.js';

// Console is https://firebase.corp.google.com/project/arcs-storage-test/database/arcs-storage-test/data/firebase-storage-test
const testUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/firebase-storage-test';
const backingStoreUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/backingStores';

// Resolves when the two stores are synchronized with each other:
// * same version
// * no pending changes
async function synchronized(store1, store2, delay=1) {
  while (store1._hasLocalChanges || store2._hasLocalChanges || store1.versionForTesting !== store2.versionForTesting) {
    await new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

describe('firebase', function() {
  this.timeout(20000);

  let lastStoreId = 0;
  function newStoreKey(name) {
    return `${testUrl}/${name}-${lastStoreId++}`;
  }

  before(async () => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    await resetStorageForTesting(testUrl);
    await resetStorageForTesting(backingStoreUrl);
  });

  let storageInstances: StorageProviderFactory[] = [];

  function createStorage(id: Id): StorageProviderFactory {
    const storage = new StorageProviderFactory(id, new ManifestHandleRetriever());
    storageInstances.push(storage);
    return storage;
  }

  after(async () => {
    await Promise.all(storageInstances.map(s => s.shutdown()));
    storageInstances = [];
  });

  describe('variable', () => {
    it('supports basic construct and mutate', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const value = 'Hi there' + Math.random();
      const variable = await storage.construct('test0', barType, newStoreKey('variable')) as SingletonStorageProvider;

      let events = 0;
      variable.legacyOn(() => events++);

      await variable.set({id: 'test0:test', value});
      const result = await variable.fetch();
      assert.strictEqual(result.value, value);

      assert.strictEqual(variable._version, 1);
      assert.strictEqual(events, 1);
    });

    it('resolves concurrent set', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('variable');
      const var1 = await storage.construct('test0', barType, key) as SingletonStorageProvider;
      const var2 = await storage.connect('test0', barType, key) as SingletonStorageProvider;

      void var1.set({id: 'id1', value: 'value1'});
      void var2.set({id: 'id2', value: 'value2'});
      await synchronized(var1, var2);
      assert.deepEqual(await var1.fetch(), await var2.fetch());
    });

    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', barType, key1) as SingletonStorageProvider;
      await var1.set({id: 'id1', value: 'underlying'});

      const result = await var1.fetch();
      assert.strictEqual(result.value, 'underlying');

      assert.isTrue(var1.referenceMode);
      assert.isNotNull(var1.backingStore);

      assert.deepEqual(await var1.backingStore.get('id1'), await var1.fetch());
    });

    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});

      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', new ReferenceType(barType), key1) as SingletonStorageProvider;
      await var1.set({id: 'id1', storageKey: 'underlying'});

      const result = await var1.fetch();
      assert.strictEqual(result.storageKey, 'underlying');

      assert.isFalse(var1.referenceMode);
      assert.isNull(var1.backingStore);
    });

    it('multiple variables with the same backing store', async () => {
      // Note the schema needs to be unique across this file, to avoid polluting other tests
      // related to FirebaseBackingStore.
      const manifest = await Manifest.parse(`
        schema Bar1
          data: Text
      `);
      const barType = new EntityType(manifest.schemas.Bar1);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);

      const var1 = await storage.construct('test1', barType, newStoreKey('variable')) as SingletonStorageProvider;
      const var2 = await storage.construct('test2', barType, newStoreKey('variable')) as SingletonStorageProvider;

      const bar = n => ({id: 'id' + n, data: 'd' + n});
      await var1.set(bar(1));
      await var2.set(bar(2));

      // The two variables have the same Type objects, so they should reference the same backing
      // store instance.
      const backing = var1.backingStore;
      assert.isNotNull(backing);
      assert.strictEqual(backing, var2.backingStore);

      assert.deepEqual(await var1.fetch(), bar(1));
      assert.deepEqual(await var2.fetch(), bar(2));
      assert.sameDeepMembers(await backing.toList(), [bar(1), bar(2)]);

      await var1.clear();
      await var2.set(bar(3));

      assert.isNull(await var1.fetch());
      assert.deepEqual(await var2.fetch(), bar(3));
      assert.sameDeepMembers(await backing.toList(), [bar(1), bar(2), bar(3)]);
    });
  });

  describe('collection', () => {
    it('supports basic construct and mutate', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const value1 = 'Hi there' + Math.random();
      const value2 = 'Goodbye' + Math.random();
      const collection = await storage.construct('test1', barType.collectionOf(), newStoreKey('collection')) as CollectionStorageProvider;

      let events = 0;
      collection.legacyOn(() => events++);

      await collection.store({id: 'id0', value: value1}, ['key0']);
      await collection.store({id: 'id1', value: value2}, ['key1']);
      let result = await collection.fetchAll('id0');
      assert.strictEqual(result.value, value1);
      result = await collection.toList();
      assert.deepEqual(result, [{id: 'id0', value: value1}, {id: 'id1', value: value2}]);

      assert.strictEqual(collection._version, 2);
      assert.strictEqual(events, 2);
    });

    it('resolves concurrent add of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      const collection2 = await storage.connect('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      void collection1.store({id: 'id1', value: 'value'}, ['key1']);
      await collection2.store({id: 'id1', value: 'value'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.deepEqual(await collection1.toList(), await collection2.toList());
    });

    it('resolves concurrent add/remove of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      const collection2 = await storage.connect('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      void collection1.store({id: 'id1', value: 'value'}, ['key1']);
      void collection2.store({id: 'id1', value: 'value'}, ['key2']);
      void collection1.remove('id1', ['key1']);
      void collection2.remove('id1', ['key2']);
      await synchronized(collection1, collection2);
      assert.isEmpty(await collection1.toList());
      assert.isEmpty(await collection2.toList());
    });

    it('resolves concurrent add of different id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      const collection2 = await storage.connect('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.lengthOf(await collection1.toList(), 2);
      assert.sameDeepMembers(await collection1.toList(), await collection2.toList());
    });

    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);

      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');

      const collection1 = await storage.construct('test0', barType.collectionOf(), key1) as CollectionStorageProvider;

      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', value: 'value2'}, ['key2']);

      let result = await collection1.fetchAll('id1');
      assert.strictEqual(result.value, 'value1');
      result = await collection1.fetchAll('id2');
      assert.strictEqual(result.value, 'value2');

      assert.isTrue(collection1.referenceMode);
      assert.isNotNull(collection1.backingStore);

      assert.deepEqual(await collection1.backingStore.get('id1'), await collection1.fetchAll('id1'));
      assert.deepEqual(await collection1.backingStore.get('id2'), await collection1.fetchAll('id2'));
    });

    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);

      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');

      const collection1 = await storage.construct('test0', new ReferenceType(barType).collectionOf(), key1) as CollectionStorageProvider;
      await collection1.store({id: 'id1', storageKey: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', storageKey: 'value2'}, ['key2']);

      let result = await collection1.fetchAll('id1');
      assert.strictEqual(result.storageKey, 'value1');
      result = await collection1.fetchAll('id2');
      assert.strictEqual(result.storageKey, 'value2');

      assert.isFalse(collection1.referenceMode);
      assert.isNull(collection1.backingStore);
    });

    it('supports removeMultiple', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection = await storage.construct('test1', barType.collectionOf(), key) as CollectionStorageProvider;
      await collection.store({id: 'id1', value: 'value'}, ['key1']);
      await collection.store({id: 'id2', value: 'value'}, ['key2']);
      await collection.removeMultiple([{id: 'id1', keys: ['key1']}, {id: 'id2', keys: ['key2']}]);
      assert.isEmpty(await collection.toList());
    });

    it('multiple collections with the same backing store', async () => {
      // Note the schema needs to be unique across this file, to avoid polluting other tests
      // related to FirebaseBackingStore.
      const manifest = await Manifest.parse(`
        schema Bar2
          data: Text
      `);
      const barType = new EntityType(manifest.schemas.Bar2);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);

      const col1 = await storage.construct('test1', barType.collectionOf(), newStoreKey('collection')) as CollectionStorageProvider;
      const col2 = await storage.construct('test2', barType.collectionOf(), newStoreKey('collection')) as CollectionStorageProvider;

      const bar = n => ({id: 'id' + n, data: 'd' + n});
      await col1.store(bar(1), ['key1']);
      await col2.store(bar(2), ['key2']);
      await col1.store(bar(3), ['key3']);

      // The two collections have the same type (as different Type objects), so they should
      // reference the same backing store instance.
      const backing = col1.backingStore;
      assert.isNotNull(backing);
      assert.strictEqual(backing, col2.backingStore);

      // The two collections should see only their own additions, while the backing store sees all.
      assert.sameDeepMembers(await col1.toList(), [bar(1), bar(3)]);
      assert.sameDeepMembers(await col2.toList(), [bar(2)]);
      assert.sameDeepMembers(await backing.toList(), [bar(1), bar(2), bar(3)]);

      // Removing one of col2's ids from col1 should have no effect.
      await col1.removeMultiple([{id: 'id1', keys: []}, {id: 'id2', keys: []}]);
      assert.sameDeepMembers(await col1.toList(), [bar(3)]);
      assert.sameDeepMembers(await col2.toList(), [bar(2)]);

      // Remove ops are *not* currently propagated to the backing.
      assert.sameDeepMembers(await backing.toList(), [bar(1), bar(2), bar(3)]);

      // Both collections can store the same entity with different keys.
      await Promise.all([col1.store(bar(4), ['key4a']), col2.store(bar(4), ['key4b'])]);
      assert.sameDeepMembers(await col1.toList(), [bar(3), bar(4)]);
      assert.sameDeepMembers(await col2.toList(), [bar(2), bar(4)]);
      assert.sameDeepMembers(await backing.toList(), [bar(1), bar(2), bar(3), bar(4)]);

      // Remove the duplicate from one collection shouldn't affect the other.
      await col2.remove('id4', []);
      assert.sameDeepMembers(await col1.toList(), [bar(3), bar(4)]);
      assert.sameDeepMembers(await col2.toList(), [bar(2)]);
    });
  });

  // For these tests, the following index rule should be manually set up in the console at
  // https://firebase.corp.google.com/project/arcs-storage-test/database/arcs-storage-test/rules:
  //   "rules": {
  //     "firebase-storage-test": {
  //       "$collection": {
  //         "items": {
  //           ".indexOn": ["index"]
  //         }
  //       }
  //     }
  //   }
  //
  // Ideally these would be broken into smaller independent test cases, but since we're using a
  // live remote database instance the setup is too expensive to keep repeating.
  describe('big collection', () => {
    it('supports get, store and remove (including concurrently)', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          data: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('bigcollection');
      const collection1 = await storage.construct('test0', barType.bigCollectionOf(), key) as BigCollectionStorageProvider;
      const collection2 = await storage.connect('test0', barType.bigCollectionOf(), key) as BigCollectionStorageProvider;

      // Concurrent writes to different ids.
      await Promise.all([
        collection1.store({id: 'id1', data: 'ab'}, ['k34']),
        collection2.store({id: 'id2', data: 'cd'}, ['k12'])
      ]);
      assert.strictEqual((await collection2.fetchAll('id1')).data, 'ab');
      assert.strictEqual((await collection1.fetchAll('id2')).data, 'cd');

      await collection1.remove('id2');
      assert.isNull(await collection2.fetchAll('id2'));

      // Concurrent writes to the same id.
      await Promise.all([
        collection1.store({id: 'id3', data: 'xx'}, ['k65']),
        collection2.store({id: 'id3', data: 'yy'}, ['k87'])
      ]);
      assert.include(['xx', 'yy'], (await collection1.fetchAll('id3')).data);

      assert.isNull(await collection1.fetchAll('non-existent'));

      await collection1.remove('non-existent');
    });

    // Stores a new item for each id in both col and items, with data and key derived
    // from the numerical part of the id in a lexicographically "random" manner.
    async function store(col, items, ...ids) {
      const promises = [];
      for (const id of ids) {
        const n = Number(id.slice(1));
        const data = 'v' + (n * 37 % 100);
        const key = 'k' + (n * 73 % 100);
        promises.push(col.store({id, data}, [key]));
        items.set(id, {data, key});
      }
      return Promise.all(promises);
    }

    // Verifies that cursor.next() returns items matching the given list of ids (in order).
    async function checkNext(col, items, cid, ids) {
      const {value, done} = await col.cursorNext(cid);
      assert.isFalse(done);
      assert.strictEqual(value.length, ids.length);
      for (let i = 0; i < value.length; i++) {
        assert.strictEqual(value[i].id, ids[i]);
        assert.strictEqual(value[i].data, items.get(ids[i]).data);
      }
    }

    // Verifies that the cursor does not contain any more items.
    async function checkDone(col, cid) {
      const {value, done} = await col.cursorNext(cid);
      assert.isTrue(done);
      assert.isUndefined(value);
    }

    // Verifies a full streamed read with the given page size.
    async function checkStream(col, items, pageSize, forward, ...idRows) {
      const cid = await col.stream(pageSize, forward);
      for (const ids of idRows) {
        await checkNext(col, items, cid, ids);
      }
      await checkDone(col, cid);
    }

    it('supports version-stable streamed reads forwards', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          data: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const col = await storage.construct('test0', barType.bigCollectionOf(), newStoreKey('bigcollection')) as BigCollectionStorageProvider;
      const items = new Map();

      // Add an initial set of items with lexicographically "random" ids.
      await store(col, items, 'r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08');

      // Test streamed reads with various page sizes.
      await checkStream(col, items, 3, true, ['r01', 'i02', 'z03'], ['q04', 'h05', 'y06'], ['p07', 'g08']);
      await checkStream(col, items, 4, true, ['r01', 'i02', 'z03', 'q04'], ['h05', 'y06', 'p07', 'g08']);
      await checkStream(col, items, 7, true, ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07'], ['g08']);
      await checkStream(col, items, 8, true, ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08']);

      await store(col, items, 'x09', 'o10', 'f11', 'w12', 'e13', 'j14');

      // Add operations that occur after cursor creation should not affect streamed reads.
      // Items removed "ahead" of the read should be captured and returned later in the stream.
      const cid1 = await col.stream(4);

      // Remove the item at the start of the first page and another from a later page:
      await col.remove('r01');
      await col.remove('p07');
      await store(col, items, 't15');
      await checkNext(col, items, cid1, ['i02', 'z03', 'q04', 'h05']);

      // Interleave another streamed read over a different version of the collection. cursor2
      // should be 3 versions ahead due to the 3 add/remove operations above.
      const cid2 = await col.stream(5);
      assert.strictEqual(col.cursorVersion(cid2), col.cursorVersion(cid1) + 3);
      await store(col, items, 's16');

      // For cursor1: remove one item from the page just returned and two at the edges of the next page:
      await col.remove('z03');
      await col.remove('y06');
      await col.remove('f11');

      await checkNext(col, items, cid2, ['i02', 'q04', 'h05', 'g08', 'x09']);
      await checkNext(col, items, cid1, ['g08', 'x09', 'o10', 'w12']);

      // This uses up the remaining non-removed items for cursor2 ---> [*]
      await checkNext(col, items, cid2, ['o10', 'w12', 'e13', 'j14', 't15']);

      // For cursor1: the next page should include the two remaining items and two of the previously
      // removed ones (which are returned in reverse order of removal).
      await checkNext(col, items, cid1, ['e13', 'j14', 'f11', 'y06']);

      // Remove another previously-returned item; should have no effect on either cursor.
      await col.remove('x09');
      await checkNext(col, items, cid1, ['p07', 'r01']);
      await store(col, items, 'm17');
      await checkDone(col, cid1);

      // Streaming again should be up-to-date (even with cursor2 still in flight).
      await checkStream(col, items, 50, true,
          ['i02', 'q04', 'h05', 'g08', 'o10', 'w12', 'e13', 'j14', 't15', 's16', 'm17']);

      // [*] ---> so that this page is only removed items.
      await checkNext(col, items, cid2, ['f11', 'y06', 'z03']);
      await checkDone(col, cid2);

      // Repeated next() calls on a finished cursor should be safe.
      await checkDone(col, cid2);

      // close() should terminate a stream.
      const cid3 = await col.stream(3);
      await checkNext(col, items, cid3, ['i02', 'q04', 'h05']);
      col.cursorClose(cid3);
      await checkDone(col, cid3);
    }).timeout(40000);

    it('supports version-stable streamed reads backwards', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          data: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const col = await storage.construct('test0', barType.bigCollectionOf(), newStoreKey('bigcollection')) as BigCollectionStorageProvider;
      const items = new Map();

      // Add an initial set of items with lexicographically "random" ids.
      await store(col, items, 'r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08');

      // Test streamed reads with various page sizes.
      await checkStream(col, items, 3, false, ['g08', 'p07', 'y06'], ['h05', 'q04', 'z03'], ['i02', 'r01']);
      await checkStream(col, items, 4, false, ['g08', 'p07', 'y06', 'h05'], ['q04', 'z03', 'i02', 'r01']);
      await checkStream(col, items, 7, false, ['g08', 'p07', 'y06', 'h05', 'q04', 'z03', 'i02'], ['r01']);
      await checkStream(col, items, 8, false, ['g08', 'p07', 'y06', 'h05', 'q04', 'z03', 'i02', 'r01']);

      await store(col, items, 'x09', 'o10', 'f11', 'w12', 'e13', 'j14');

      // Add operations that occur after cursor creation should not affect streamed reads.
      // Items removed "ahead" of the read should be captured and returned later in the stream.
      const cid1 = await col.stream(4, false);

      // Remove the item at the start of the first page and another from a later page.
      await col.remove('j14');
      await col.remove('g08');
      await store(col, items, 't15');
      await checkNext(col, items, cid1, ['e13', 'w12', 'f11', 'o10']);

      // Interleave another streamed read over a different version of the collection. cursor2
      // should be 3 versions ahead due to the 3 add/remove operations above.
      const cid2 = await col.stream(5, false);
      assert.strictEqual(col.cursorVersion(cid2), col.cursorVersion(cid1) + 3);
      await store(col, items, 's16');

      // For cursor1: remove one item from the page just returned and two at the edges of the next page.
      await col.remove('w12');
      await col.remove('x09');
      await col.remove('q04');

      await checkNext(col, items, cid2, ['t15', 'e13', 'f11', 'o10', 'p07']);
      await checkNext(col, items, cid1, ['p07', 'y06', 'h05', 'z03']);

      // This uses up the remaining non-removed items for cursor2 ---> [*]
      await checkNext(col, items, cid2, ['y06', 'h05', 'z03', 'i02', 'r01']);

      // For cursor1: the next page should include the two remaining items and two of the previously
      // removed ones (which are returned in reverse order of removal).
      await checkNext(col, items, cid1, ['i02', 'r01', 'q04', 'x09']);

      // Remove another previously-returned item; should have no effect on either cursor.
      await col.remove('y06');
      await checkNext(col, items, cid1, ['g08', 'j14']);
      await store(col, items, 'm17');
      await checkDone(col, cid1);

      // Streaming again should be up-to-date (even with cursor2 still in flight).
      await checkStream(col, items, 50, false,
          ['m17', 's16', 't15', 'e13', 'f11', 'o10', 'p07', 'h05', 'z03', 'i02', 'r01']);

      // [*] ---> so that this page is only removed items.
      await checkNext(col, items, cid2, ['q04', 'x09', 'w12']);
      await checkDone(col, cid2);

      // Repeated next() calls on a finished cursor should be safe.
      await checkDone(col, cid2);

      // close() should terminate a stream.
      const cid3 = await col.stream(3, false);
      await checkNext(col, items, cid3, ['m17', 's16', 't15']);
      col.cursorClose(cid3);
      await checkDone(col, cid3);
    }).timeout(40000);

    // TODO(cypher1): Disabled temporarily, breaking on master.
    it.skip('big collection API works from inside the PEC', async () => {
      const fileMap = {
        manifest: `
          schema Data
            value: Text

          particle P in 'a.js'
            big: reads writes BigCollection<Data>

          recipe
            handle0: use 'test:0'
            P
              big: handle0
        `,
        'a.js': `
          'use strict';

          defineParticle(({Particle}) => {
            return class P extends Particle {
              async setHandles(handles) {
                let collection = handles.get('big');

                // Verify that store and remove work from a particle.
                await collection.store(new collection.entityClass({value: 'morty'}));
                let toRemove = new collection.entityClass({value: 'barry'});
                await collection.store(toRemove);
                await collection.store(new collection.entityClass({value: 'rick'}));
                await collection.remove(toRemove);
                await collection.remove(new collection.entityClass({value: 'no one'}));

                // Verify that streamed reads work by writing back what we read.
                let result = await this.read(collection);
                await collection.store(new collection.entityClass({value: result}));
              }

              async read(collection) {
                let items = [];
                let cursor = await collection.stream({pageSize: 1, forward: false});
                for (let i = 0; i < 3; i++) {
                  let {value, done} = await cursor.next();
                  if (done) {
                    return items.join('&');
                  }
                  items.push(...value.map(item => item.value));
                }
                return 'error - cursor did not terminate correctly';
              }
            }
          });
        `
      };
      const loader = new Loader(null, fileMap);
      const manifest = await Manifest.parse(fileMap.manifest);
      const runtime = new Runtime({loader, context: manifest});
      const arc = runtime.newArc('demo', 'volatile://');
      const storage = createStorage(arc.id);
      const dataType = new EntityType(manifest.schemas.Data);
      const bigStore = await storage.construct('test0', dataType.bigCollectionOf(), newStoreKey('bigcollection')) as BigCollectionStorageProvider;
      const recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(bigStore);
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      const cursorId = await bigStore.stream(5);
      const data = await bigStore.cursorNext(cursorId);
      assert.deepEqual(data.value.map(item => item.rawData.value), ['morty', 'rick', 'rick&morty']);
    });

    // TODO(cypher1): Disabled temporarily, breaking on master.
    it.skip('serialization roundtrip re-attaches to the same firebase stores', async () => {
      const loader = new Loader(null, {
        manifest: `
          schema Data
            value: Text

          particle P in 'a.js'
            var: reads Data
            col: writes [Data]
            big: reads writes BigCollection<Data>

          recipe
            handle0: use *
            handle1: use *
            handle2: use *
            P
              var: reads handle0
              col: writes handle1
              big: handle2
        `,
        'a.js': `
          defineParticle(({Particle}) => class Noop extends Particle {});
        `
      });
      const manifest = await Manifest.load('manifest', loader);
      const arc = new Arc({id: ArcId.newForTest('test'), loader, context: manifest});
      const storage = createStorage(arc.id);
      const dataType = new EntityType(manifest.schemas.Data);

      const varStore = await storage.construct('test0', dataType, newStoreKey('variable')) as SingletonStorageProvider;
      const colStore = await storage.construct('test1', dataType.collectionOf(), newStoreKey('collection')) as CollectionStorageProvider;
      const bigStore = await storage.construct('test2', dataType.bigCollectionOf(), newStoreKey('bigcollection')) as BigCollectionStorageProvider;
      console.log(varStore.id, colStore.id, bigStore.id);

      // Populate the stores, run the arc and get its serialization.
      await varStore.set({id: 'i1', rawData: {value: 'v1'}});
      await colStore.store({id: 'i2', rawData: {value: 'v2'}}, ['k2']);
      await bigStore.store({id: 'i3', rawData: {value: 'v3'}}, ['k3']);

      const recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(varStore);
      recipe.handles[1].mapToStorage(colStore);
      recipe.handles[2].mapToStorage(bigStore);
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      const serialization = await arc.serialize();
      console.log(serialization);
      arc.dispose();
      console.log('dispose');
      console.log(varStore.id, colStore.id, bigStore.id);

      // Update the stores between serializing and deserializing.
      await varStore.set({id: 'i4', rawData: {value: 'v4'}});
      await colStore.store({id: 'i5', rawData: {value: 'v5'}}, ['k5']);
      await bigStore.store({id: 'i6', rawData: {value: 'v6'}}, ['k6']);

      const arc2 = await Arc.deserialize({serialization, loader, fileName: '', pecFactories: undefined, slotComposer: undefined, context: manifest});
      const varStore2 = arc2.findStoreById(varStore.id) as SingletonStorageProvider;
      const colStore2 = arc2.findStoreById(colStore.id) as CollectionStorageProvider;
      const bigStore2 = arc2.findStoreById(bigStore.id) as BigCollectionStorageProvider;

      // New storage providers should have been created.
      assert.notStrictEqual(varStore2, varStore);
      assert.notStrictEqual(colStore2, colStore);
      assert.notStrictEqual(bigStore2, bigStore);

      // The new providers should reflect the updates made to the stores.
      assert.strictEqual((await varStore2.fetch()).rawData.value, 'v4');
      assert.deepEqual((await colStore2.toList()).map(e => e.rawData.value), ['v2', 'v5']);

      const cursorId = await bigStore.stream(5);
      const {value, done} = await bigStore.cursorNext(cursorId);
      assert.isFalse(done);
      assert.deepEqual(value.map(e => e.rawData.value), ['v3', 'v6']);
      assert.isTrue((await bigStore.cursorNext(cursorId)).done);
    });
  });

  describe('backing store', () => {
    it('backing store API', async () => {
      // Note the schema needs to be unique across this file, to avoid polluting other tests
      // related to FirebaseBackingStore.
      const manifest = await Manifest.parse(`
        schema Bar3
          data: Text
      `);
      const barType = new EntityType(manifest.schemas.Bar3);
      const arc = new Arc({id: ArcId.newForTest('test'), loader: new Loader(), context: manifest});
      const storage = createStorage(arc.id);
      const col = await storage.construct('test1', barType.collectionOf(), newStoreKey('collection')) as CollectionStorageProvider;
      const backing = await col.ensureBackingStore();
      backing.maxConcurrentRequests = 3;

      const bar = n => ({id: 'id' + n, data: 'd' + n});

      // store, storeMultiple
      await backing.store(bar(1), ['key1']);
      await backing.store(bar(2), ['key2a', 'key2b', 'key2c']);
      await backing.storeMultiple([bar(3), bar(4), bar(5), bar(6)], ['keyM']);

      // get, getMultiple, toList
      assert.deepEqual(await backing.get('id1'), bar(1));
      assert.deepEqual(await backing.get('id5'), bar(5));
      assert.isNull(await backing.get('not-an-id'));
      assert.deepEqual(await backing.getMultiple(['id6', 'id2', 'not-an-id', 'id5']), [bar(6), bar(2), null, bar(5)]);
      assert.sameDeepMembers(await backing.toList(), [bar(1), bar(2), bar(3), bar(4), bar(5), bar(6)]);

      // remove: removing a subset of keys should not delete item
      await backing.remove('id2', ['key2b']);
      assert.deepEqual(await backing.get('id2'), bar(2));

      // removing remaining keys should delete item
      await backing.remove('id2', ['key2c', 'key2a', 'not-a-key']);
      assert.isNull(await backing.get('id2'));

      // empty key list should delete item
      await backing.remove('id6', []);
      assert.isNull(await backing.get('id6'));

      // removing a non-existent key should have no effect
      await backing.remove('id1', ['not-a-key']);
      assert.deepEqual(await backing.get('id1'), bar(1));

      // removing a non-existent id should have no effect
      await backing.remove('not-an-id', []);
      assert.isNull(await backing.get('not-an-id'));

      // removeMultiple: safe to use non-existent keys and ids
      await backing.removeMultiple([
        {id: 'id1', keys: ['key1']},
        {id: 'id4', keys: ['keyM']},
        {id: 'id5', keys: ['not-a-key']},
        {id: 'not-an-id', keys: []}
      ]);
      assert.sameDeepMembers(await backing.toList(), [bar(3), bar(5)]);

      // removeMultiple: empty key list deletes item, removing subset of keys does not
      await backing.store(bar(7), ['key7a', 'key7b', 'key7c']);
      await backing.store(bar(8), ['key8a', 'key8b', 'key8c']);
      await backing.removeMultiple([
        {id: 'id7', keys: []},
        {id: 'id8', keys: ['key8b', 'key8c']},
      ]);
      assert.sameDeepMembers(await backing.toList(), [bar(3), bar(5), bar(8)]);

      // removeMultiple: empty item list deletes everything
      await backing.removeMultiple([]);
      assert.isEmpty(await backing.toList());
    });
  });
});
