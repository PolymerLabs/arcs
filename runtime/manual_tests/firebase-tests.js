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
import {resetStorageForTesting} from '../ts-build/storage/firebase-storage.js';

// Console is https://firebase.corp.google.com/project/arcs-storage-test/database/arcs-storage-test/data/firebase-storage-test
const testUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/firebase-storage-test';

// Resolves when the two stores are synchronized with each other:
// * same version
// * no pending changes
async function synchronized(store1, store2, delay=1) {
  while (store1._hasLocalChanges || store2._hasLocalChanges || store1.versionForTesting != store2.versionForTesting) {
    await new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

describe('firebase', function() {
  this.timeout(10000); // eslint-disable-line no-invalid-this

  let lastStoreId = 0;
  function newStoreKey(name) {
    return `${testUrl}/${name}-${lastStoreId++}`;
  }

  before(async () => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    await resetStorageForTesting(testUrl);
  });

  let storageInstances = [];

  function createStorage(id) {
    let storage = new StorageProviderFactory(id);
    storageInstances.push(storage);
    return storage;
  }

  after(() => {
    storageInstances.map(s => s.shutdown());
    storageInstances = [];
  });

  describe('variable', () => {
    it('supports basic construct and mutate', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('variable');
      let var1 = await storage.construct('test0', BarType, key);
      let var2 = await storage.connect('test0', BarType, key);
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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('varPtr');

      let var1 = await storage.construct('test0', Type.newReference(BarType), key1);
      await var1.set({id: 'id1', value: 'underlying'});

      let result = await var1.get();
      assert.equal('underlying', result.value);

      let underlyingValue = await storage._storageInstances['firebase'].baseStores.get(BarType).get('id1');
      assert.equal('underlying', underlyingValue.value);

      // force variable to reconnect to underlying storage
      var1._backingStore = null;
      assert.equal('underlying', (await var1.get()).value);
    });
  });

  describe('collection', () => {
    it('supports basic construct and mutate', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      let collection2 = await storage.connect('test1', BarType.collectionOf(), key);
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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      let collection2 = await storage.connect('test1', BarType.collectionOf(), key);
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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      let collection2 = await storage.connect('test1', BarType.collectionOf(), key);
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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('colPtr');
  
      let collection1 = await storage.construct('test0', Type.newReference(BarType).collectionOf(), key1);
  
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', value: 'value2'}, ['key2']);
      
      let result = await collection1.get('id1');
      assert.equal('value1', result.value);
      result = await collection1.get('id2');
      assert.equal('value2', result.value);
      
      result = await collection1.toList();
      let underlyingValues = await storage._storageInstances['firebase'].baseStores.get(BarType);

      assert.sameDeepMembers(result, await underlyingValues.toList());

      // force collection to reconnect to Entity storage
      collection1._backingStore = null;

      result = await collection1.toList();
      assert.sameDeepMembers(result, await underlyingValues.toList());
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
  describe('big collection', () => {
    it('supports get, store and remove (including concurrently)', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text data
      `);
      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('bigcollection');
      let collection1 = await storage.construct('test0', BarType.bigCollectionOf(), key);
      let collection2 = await storage.connect('test0', BarType.bigCollectionOf(), key);

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

    // Ideally this would be several independent test cases, but since we're using a live remote
    // database instance the setup is too expensive to keep repeating.
    it('supports version-stable streamed reads', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text data
      `);
      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let collection = await storage.construct('test0', BarType.bigCollectionOf(), newStoreKey('bigcollection'));
      let items = new Map();

      // Stores a new item for each id in both collection and items, with data and key derived
      // from the numerical part of the id in a lexicographically "random" manner.
      let store = (...ids) => {
        let promises = [];
        for (let id of ids) {
          let n = Number(id.slice(1));
          let data = 'v' + (n * 37 % 100);
          let key = 'k' + (n * 73 % 100);
          promises.push(collection.store({id, data}, [key]));
          items.set(id, {data, key});
        }
        return Promise.all(promises);
      };

      // Add an initial set of items with lexicographically "random" ids.
      await store('r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08');
 
      // Verifies that cursor.next() returns items matching the given list of ids (in order).
      let checkNext = async (cursor, ids) => {
        let {value, done} = await cursor.next();
        assert.isFalse(done);
        assert.equal(value.length, ids.length);
        for (let i = 0; i < value.length; i++) {
          assert.equal(value[i].id, ids[i]);
          assert.equal(value[i].data, items.get(ids[i]).data);
        }
      };

      // Verifies that cursor does not contain any more items.
      let checkDone = async cursor => {
        let {value, done} = await cursor.next();
        assert.isTrue(done);
        assert.isUndefined(value);
      };

      // Verifies a full streamed read with the given page size.
      let checkStream = async (pageSize, ...idRows) => {
        let cursor = await collection.stream(pageSize);
        for (let ids of idRows) {
          await checkNext(cursor, ids);
        }
        await checkDone(cursor);
      };

      // Test streamed reads with various page sizes.
      await checkStream(3, ['r01', 'i02', 'z03'], ['q04', 'h05', 'y06'], ['p07', 'g08']);
      await checkStream(4, ['r01', 'i02', 'z03', 'q04'], ['h05', 'y06', 'p07', 'g08']);
      await checkStream(7, ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07'], ['g08']);
      await checkStream(8, ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08']);

      await store('x09', 'o10', 'f11', 'w12', 'e13', 'j14');

      // Add operations that occur after cursor creation should not affect streamed reads.
      // Items removed "ahead" of the read should be captured and returned later in the stream.
      let cursor1 = await collection.stream(4);

      // Remove the item at the start of the first page and another from a later page.
      await collection.remove('r01');
      await collection.remove('p07');
      await store('t15');
      await checkNext(cursor1, ['i02', 'z03', 'q04', 'h05']);

      // Interleave another streamed read over a different version of the collection. cursor2
      // should be 3 versions ahead due to the 3 add/remove operations above.
      let cursor2 = await collection.stream(5);
      assert.equal(cursor2.version, cursor1.version + 3);
      await store('s16');

      // For cursor1: remove one item from the page just returned and two at the edges of the next page.
      await collection.remove('z03');
      await collection.remove('y06');
      await collection.remove('f11');

      await checkNext(cursor2, ['i02', 'q04', 'h05', 'g08', 'x09']);
      await checkNext(cursor1, ['g08', 'x09', 'o10', 'w12']);
      
      // This uses up the remaining non-removed items for cursor2 ---> [*]
      await checkNext(cursor2, ['o10', 'w12', 'e13', 'j14', 't15']);

      // For cursor1: the next page should include the two remaining items and two of the previously
      // removed ones (which are returned in reverse order of removal).
      await checkNext(cursor1, ['e13', 'j14', 'f11', 'y06']);

      // Remove another previously-returned item; should have no effect on either cursor.
      await collection.remove('x09');
      await checkNext(cursor1, ['p07', 'r01']);
      await store('m17');
      await checkDone(cursor1);

      // Streaming again should be up-to-date (even with cursor2 still in flight).
      await checkStream(12, ['i02', 'q04', 'h05', 'g08', 'o10', 'w12', 'e13', 'j14', 't15', 's16', 'm17']);

      // [*] ---> so that this page is only removed items.
      await checkNext(cursor2, ['f11', 'y06', 'z03']);
      await checkDone(cursor2);

      // Repeated next() calls on a finished cursor should be safe.
      await checkDone(cursor2);

      // close() should terminate a stream.
      let cursor3 = await collection.stream(3);
      await checkNext(cursor3, ['i02', 'q04', 'h05']);
      await cursor3.close();
      await checkDone(cursor3);
    }).timeout(20000);
  });
});
