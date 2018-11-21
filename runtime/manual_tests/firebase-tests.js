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
import {Arc} from '../ts-build/arc.js';
import {Manifest} from '../ts-build/manifest.js';
import {Type} from '../ts-build/type.js';
import {assert} from '../test/chai-web.js';
import {resetStorageForTesting} from '../ts-build/storage/firebase-storage.js';
import {StubLoader} from '../testing/stub-loader.js';
import {TestHelper} from '../testing/test-helper.js';
import {MessageChannel} from '../ts-build/message-channel.js';
import {ParticleExecutionContext} from '../ts-build/particle-execution-context.js';

// Console is https://firebase.corp.google.com/project/arcs-storage-test/database/arcs-storage-test/data/firebase-storage-test
const testUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/firebase-storage-test';
const backingStoreUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/backingStores';

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
    await resetStorageForTesting(backingStoreUrl);
  });

  let storageInstances = [];

  function createStorage(id) {
    const storage = new StorageProviderFactory(id);
    storageInstances.push(storage);
    return storage;
  }

  after(() => {
    storageInstances.map(s => s.shutdown());
    storageInstances = [];
  });

  describe('variable', () => {
    it('supports basic construct and mutate', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const value = 'Hi there' + Math.random();
      const variable = await storage.construct('test0', BarType, newStoreKey('variable'));
      await variable.set({id: 'test0:test', value});
      const result = await variable.get();
      assert.equal(value, result.value);
    });
    it('resolves concurrent set', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key = newStoreKey('variable');
      const var1 = await storage.construct('test0', BarType, key);
      const var2 = await storage.connect('test0', BarType, key);
      var1.set({id: 'id1', value: 'value1'});
      var2.set({id: 'id2', value: 'value2'});
      await synchronized(var1, var2);
      assert.deepEqual(await var1.get(), await var2.get());
    });
    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');
  
      const var1 = await storage.construct('test0', BarType, key1);
      await var1.set({id: 'id1', value: 'underlying'});
      
      const result = await var1.get();
      assert.equal(result.value, 'underlying');

      assert.isTrue(var1.referenceMode);
      assert.isNotNull(var1.backingStore);

      assert.deepEqual(await var1.backingStore.get('id1'), await var1.get());
    });
    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', Type.newReference(BarType), key1);
      await var1.set({id: 'id1', storageKey: 'underlying'});

      const result = await var1.get();
      assert.equal('underlying', result.storageKey);

      assert.isFalse(var1.referenceMode);
      assert.isNull(var1.backingStore);
    });
  });

  describe('collection', () => {
    it('supports basic construct and mutate', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const value1 = 'Hi there' + Math.random();
      const value2 = 'Goodbye' + Math.random();
      const collection = await storage.construct('test1', BarType.collectionOf(), newStoreKey('collection'));
      await collection.store({id: 'id0', value: value1}, ['key0']);
      await collection.store({id: 'id1', value: value2}, ['key1']);
      let result = await collection.get('id0');
      assert.equal(value1, result.value);
      result = await collection.toList();
      assert.deepEqual(result, [{id: 'id0', value: value1}, {id: 'id1', value: value2}]);
    });
    it('resolves concurrent add of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      const collection2 = await storage.connect('test1', BarType.collectionOf(), key);
      collection1.store({id: 'id1', value: 'value'}, ['key1']);
      await collection2.store({id: 'id1', value: 'value'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.deepEqual(await collection1.toList(), await collection2.toList());
    });
    it('resolves concurrent add/remove of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      const collection2 = await storage.connect('test1', BarType.collectionOf(), key);
      collection1.store({id: 'id1', value: 'value'}, ['key1']);
      collection2.store({id: 'id1', value: 'value'}, ['key2']);
      collection1.remove('id1', ['key1']);
      collection2.remove('id1', ['key2']);
      await synchronized(collection1, collection2);
      assert.isEmpty(await collection1.toList());
      assert.isEmpty(await collection2.toList());
    });
    it('resolves concurrent add of different id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', BarType.collectionOf(), key);
      const collection2 = await storage.connect('test1', BarType.collectionOf(), key);
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
      await synchronized(collection1, collection2);
      assert.lengthOf(await collection1.toList(), 2);
      assert.sameDeepMembers(await collection1.toList(), await collection2.toList());
    });
    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');
  
      const collection1 = await storage.construct('test0', BarType.collectionOf(), key1);
  
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', value: 'value2'}, ['key2']);
      
      let result = await collection1.get('id1');
      assert.equal('value1', result.value);
      result = await collection1.get('id2');
      assert.equal('value2', result.value);

      assert.isTrue(collection1.referenceMode);
      assert.isNotNull(collection1.backingStore);

      assert.deepEqual(await collection1.backingStore.get('id1'), await collection1.get('id1'));
      assert.deepEqual(await collection1.backingStore.get('id2'), await collection1.get('id2'));
    });
    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
  
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');
  
      const collection1 = await storage.construct('test0', Type.newReference(BarType).collectionOf(), key1);
  
      await collection1.store({id: 'id1', storageKey: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', storageKey: 'value2'}, ['key2']);
      
      let result = await collection1.get('id1');
      assert.equal('value1', result.storageKey);
      result = await collection1.get('id2');
      assert.equal('value2', result.storageKey);

      assert.isFalse(collection1.referenceMode);
      assert.isNull(collection1.backingStore);
    }); 
    it('supports removeMultiple', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection = await storage.construct('test1', BarType.collectionOf(), key);
      await collection.store({id: 'id1', value: 'value'}, ['key1']);
      await collection.store({id: 'id2', value: 'value'}, ['key2']);
      await collection.removeMultiple([
        {id: 'id1', keys: ['key1']}, {id: 'id2', keys: ['key2']}
      ]);
      assert.isEmpty(await collection.toList());
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
          Text data
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const key = newStoreKey('bigcollection');
      const collection1 = await storage.construct('test0', BarType.bigCollectionOf(), key);
      const collection2 = await storage.connect('test0', BarType.bigCollectionOf(), key);

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

    // Stores a new item for each id in both col and items, with data and key derived
    // from the numerical part of the id in a lexicographically "random" manner.
    function store(col, items, ...ids) {
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
      assert.equal(value.length, ids.length);
      for (let i = 0; i < value.length; i++) {
        assert.equal(value[i].id, ids[i]);
        assert.equal(value[i].data, items.get(ids[i]).data);
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
          Text data
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const col = await storage.construct('test0', BarType.bigCollectionOf(), newStoreKey('bigcollection'));
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
      assert.equal(col.cursorVersion(cid2), col.cursorVersion(cid1) + 3);
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
    }).timeout(20000);

    it('supports version-stable streamed reads backwards', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text data
      `);
      const arc = new Arc({id: 'test'});
      const storage = createStorage(arc.id);
      const BarType = Type.newEntity(manifest.schemas.Bar);
      const col = await storage.construct('test0', BarType.bigCollectionOf(), newStoreKey('bigcollection'));
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
      assert.equal(col.cursorVersion(cid2), col.cursorVersion(cid1) + 3);
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
    }).timeout(20000);

    it('big collection API works from inside the PEC', async function() {
      const fileMap = {
        manifest: `
          schema Data
            Text value

          particle P in 'a.js'
            inout BigCollection<Data> big

          recipe
            use 'test:0' as handle0
            P
              big = handle0
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
                  items.push(...value.map(item => item.rawData.value));
                }
                return 'error - cursor did not terminate correctly';
              }
            }
          });
        `
      };
      const testHelper = await TestHelper.create({
        manifestString: fileMap.manifest,
        loader: new StubLoader(fileMap)
      });
      const arc = testHelper.arc;
      const manifest = arc._context;

      const storage = createStorage(arc.id);
      const Data = Type.newEntity(manifest.schemas.Data);
      const bigStore = await storage.construct('test0', Data.bigCollectionOf(), newStoreKey('bigcollection'));
      const recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(bigStore);
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      const cursorId = await bigStore.stream(5);
      const data = await bigStore.cursorNext(cursorId);
      assert.deepEqual(data.value.map(item => item.rawData.value), ['morty', 'rick', 'rick&morty']);
    });

    it('serialization roundtrip re-attaches to the same firebase stores', async function() {
      const loader = new StubLoader({
        manifest: `
          schema Data
            Text value

          particle P in 'a.js'
            in Data var
            out [Data] col
            inout BigCollection<Data> big

          recipe
            use as handle0
            use as handle1
            use as handle2
            P
              var <- handle0
              col -> handle1
              big = handle2
        `,
        'a.js': `
          defineParticle(({Particle}) => class Noop extends Particle {});
        `
      });
      const pecFactory = function(id) {
        const channel = new MessageChannel();
        new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
        return channel.port2;
      };
      const arc = new Arc({id: 'test', pecFactory, loader});
      const manifest = await Manifest.load('manifest', loader);
      const storage = createStorage(arc.id);
      const Data = Type.newEntity(manifest.schemas.Data);

      const varStore = await storage.construct('test0', Data, newStoreKey('variable'));
      const colStore = await storage.construct('test1', Data.collectionOf(), newStoreKey('collection'));
      const bigStore = await storage.construct('test2', Data.bigCollectionOf(), newStoreKey('bigcollection'));

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
      arc.stop();

      // Update the stores between serializing and deserializing.
      await varStore.set({id: 'i4', rawData: {value: 'v4'}});
      await colStore.store({id: 'i5', rawData: {value: 'v5'}}, ['k5']);
      await bigStore.store({id: 'i6', rawData: {value: 'v6'}}, ['k6']);

      const arc2 = await Arc.deserialize({serialization, pecFactory});
      const varStore2 = arc2.findStoreById(varStore.id);
      const colStore2 = arc2.findStoreById(colStore.id);
      const bigStore2 = arc2.findStoreById(bigStore.id);

      // New storage providers should have been created.
      assert.notStrictEqual(varStore2, varStore);
      assert.notStrictEqual(colStore2, colStore);
      assert.notStrictEqual(bigStore2, bigStore);

      // The new providers should reflect the updates made to the stores.
      assert.equal((await varStore2.get()).rawData.value, 'v4');
      assert.deepEqual((await colStore2.toList()).map(e => e.rawData.value), ['v2', 'v5']);

      const cursorId = await bigStore.stream(5);
      const {value, done} = await bigStore.cursorNext(cursorId);
      assert.isFalse(done);
      assert.deepEqual(value.map(e => e.rawData.value), ['v3', 'v6']);
      assert.isTrue((await bigStore.cursorNext(cursorId)).done);
    });
  });
});
