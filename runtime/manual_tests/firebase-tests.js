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
import {StubLoader} from '../testing/stub-loader.js';
import {TestHelper} from '../testing/test-helper.js';
import {MessageChannel} from '../message-channel.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';

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
    it('enables referenceMode by default', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('varPtr');
  
      let var1 = await storage.construct('test0', BarType, key1);
      await var1.set({id: 'id1', value: 'underlying'});
      
      let result = await var1.get();
      assert.equal(result.value, 'underlying');

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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('varPtr');

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
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let value1 = 'Hi there' + Math.random();
      let value2 = 'Goodbye' + Math.random();
      let collection = await storage.construct('test1', BarType.collectionOf(), newStoreKey('collection'));
      await collection.store({id: 'id0', value: value1}, ['key0']);
      await collection.store({id: 'id1', value: value2}, ['key1']);
      let result = await collection.get('id0');
      assert.equal(value1, result.value);
      result = await collection.toList();
      assert.deepEqual(result, [{id: 'id0', value: value1}, {id: 'id1', value: value2}]);
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
    it('enables referenceMode by default', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('colPtr');
  
      let collection1 = await storage.construct('test0', BarType.collectionOf(), key1);
  
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
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
  
      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('colPtr');
  
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
    it('supports removeMultiple', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = createStorage(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('collection');
      let collection = await storage.construct('test1', BarType.collectionOf(), key);
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
      let checkNext = async (cursorId, ids) => {
        let {value, done} = await collection.cursorNext(cursorId);
        assert.isFalse(done);
        assert.equal(value.length, ids.length);
        for (let i = 0; i < value.length; i++) {
          assert.equal(value[i].id, ids[i]);
          assert.equal(value[i].data, items.get(ids[i]).data);
        }
      };

      // Verifies that cursor does not contain any more items.
      let checkDone = async cursorId => {
        let {value, done} = await collection.cursorNext(cursorId);
        assert.isTrue(done);
        assert.isUndefined(value);
      };

      // Verifies a full streamed read with the given page size.
      let checkStream = async (pageSize, ...idRows) => {
        let cursorId = await collection.stream(pageSize);
        for (let ids of idRows) {
          await checkNext(cursorId, ids);
        }
        await checkDone(cursorId);
      };

      // Test streamed reads with various page sizes.
      await checkStream(3, ['r01', 'i02', 'z03'], ['q04', 'h05', 'y06'], ['p07', 'g08']);
      await checkStream(4, ['r01', 'i02', 'z03', 'q04'], ['h05', 'y06', 'p07', 'g08']);
      await checkStream(7, ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07'], ['g08']);
      await checkStream(8, ['r01', 'i02', 'z03', 'q04', 'h05', 'y06', 'p07', 'g08']);

      await store('x09', 'o10', 'f11', 'w12', 'e13', 'j14');

      // Add operations that occur after cursor creation should not affect streamed reads.
      // Items removed "ahead" of the read should be captured and returned later in the stream.
      let cursorId1 = await collection.stream(4);

      // Remove the item at the start of the first page and another from a later page.
      await collection.remove('r01');
      await collection.remove('p07');
      await store('t15');
      await checkNext(cursorId1, ['i02', 'z03', 'q04', 'h05']);

      // Interleave another streamed read over a different version of the collection. cursor2
      // should be 3 versions ahead due to the 3 add/remove operations above.
      let cursorId2 = await collection.stream(5);
      assert.equal(collection.cursorVersion(cursorId2), collection.cursorVersion(cursorId1) + 3);
      await store('s16');

      // For cursor1: remove one item from the page just returned and two at the edges of the next page.
      await collection.remove('z03');
      await collection.remove('y06');
      await collection.remove('f11');

      await checkNext(cursorId2, ['i02', 'q04', 'h05', 'g08', 'x09']);
      await checkNext(cursorId1, ['g08', 'x09', 'o10', 'w12']);
      
      // This uses up the remaining non-removed items for cursor2 ---> [*]
      await checkNext(cursorId2, ['o10', 'w12', 'e13', 'j14', 't15']);

      // For cursor1: the next page should include the two remaining items and two of the previously
      // removed ones (which are returned in reverse order of removal).
      await checkNext(cursorId1, ['e13', 'j14', 'f11', 'y06']);

      // Remove another previously-returned item; should have no effect on either cursor.
      await collection.remove('x09');
      await checkNext(cursorId1, ['p07', 'r01']);
      await store('m17');
      await checkDone(cursorId1);

      // Streaming again should be up-to-date (even with cursor2 still in flight).
      await checkStream(12, ['i02', 'q04', 'h05', 'g08', 'o10', 'w12', 'e13', 'j14', 't15', 's16', 'm17']);

      // [*] ---> so that this page is only removed items.
      await checkNext(cursorId2, ['f11', 'y06', 'z03']);
      await checkDone(cursorId2);

      // Repeated next() calls on a finished cursor should be safe.
      await checkDone(cursorId2);

      // close() should terminate a stream.
      let cursorId3 = await collection.stream(3);
      await checkNext(cursorId3, ['i02', 'q04', 'h05']);
      collection.cursorClose(cursorId3);
      await checkDone(cursorId3);
    }).timeout(20000);

    it('big collection API works from inside the PEC', async function() {
      let fileMap = {
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
                await collection.store(new collection.entityClass({value: 'rick'}));
                let toRemove = new collection.entityClass({value: 'barry'});
                await collection.store(toRemove);
                await collection.store(new collection.entityClass({value: 'morty'}));
                await collection.remove(toRemove);
                await collection.remove(new collection.entityClass({value: 'no one'}));

                // Verify that streamed reads work by writing back what we read.
                let result = await this.read(collection);
                await collection.store(new collection.entityClass({value: result}));
              }

              async read(collection) {
                let items = [];
                let cursor = await collection.stream(1);
                for (let i = 0; i < 3; i++) {
                  let data = await cursor.next();
                  if (data.done) {
                    return items.join('&');
                  }
                  items.push(...data.value.map(item => item.rawData.value));
                }
                return 'error - cursor did not terminate correctly';
              }
            }
          });
        `
      };
      let testHelper = await TestHelper.create({
        manifestString: fileMap.manifest,
        loader: new StubLoader(fileMap)
      });
      let arc = testHelper.arc;
      let manifest = arc._context;

      let storage = createStorage(arc.id);
      let Data = Type.newEntity(manifest.schemas.Data);
      let bigStore = await storage.construct('test0', Data.bigCollectionOf(), newStoreKey('bigcollection'));
      let recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(bigStore);
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      let cursorId = await bigStore.stream(5);
      let data = await bigStore.cursorNext(cursorId);
      assert.deepEqual(data.value.map(item => item.rawData.value), ['rick', 'morty', 'rick&morty']);
    });

    it('serialization roundtrip re-attaches to the same firebase stores', async function() {
      let loader = new StubLoader({
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
      let pecFactory = function(id) {
        let channel = new MessageChannel();
        new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
        return channel.port2;
      };
      let arc = new Arc({id: 'test', pecFactory, loader});
      let manifest = await Manifest.load('manifest', loader);
      let storage = createStorage(arc.id);
      let Data = Type.newEntity(manifest.schemas.Data);

      let varStore = await storage.construct('test0', Data, newStoreKey('variable'));
      let colStore = await storage.construct('test1', Data.collectionOf(), newStoreKey('collection'));
      let bigStore = await storage.construct('test2', Data.bigCollectionOf(), newStoreKey('bigcollection'));

      // Populate the stores, run the arc and get its serialization.
      await varStore.set({id: 'i1', rawData: {value: 'v1'}});
      await colStore.store({id: 'i2', rawData: {value: 'v2'}}, ['k2']);
      await bigStore.store({id: 'i3', rawData: {value: 'v3'}}, ['k3']);

      let recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(varStore);
      recipe.handles[1].mapToStorage(colStore);
      recipe.handles[2].mapToStorage(bigStore);
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      let serialization = await arc.serialize();
      arc.stop();

      // Update the stores between serializing and deserializing.
      await varStore.set({id: 'i4', rawData: {value: 'v4'}});
      await colStore.store({id: 'i5', rawData: {value: 'v5'}}, ['k5']);
      await bigStore.store({id: 'i6', rawData: {value: 'v6'}}, ['k6']);

      let arc2 = await Arc.deserialize({serialization, pecFactory});
      let varStore2 = arc2.findStoreById(varStore.id);
      let colStore2 = arc2.findStoreById(colStore.id);
      let bigStore2 = arc2.findStoreById(bigStore.id);

      // New storage providers should have been created.
      assert.notStrictEqual(varStore2, varStore);
      assert.notStrictEqual(colStore2, colStore);
      assert.notStrictEqual(bigStore2, bigStore);

      // The new providers should reflect the updates made to the stores.
      assert.equal((await varStore2.get()).rawData.value, 'v4');
      assert.deepEqual((await colStore2.toList()).map(e => e.rawData.value), ['v2', 'v5']);

      let cursorId = await bigStore.stream(5);
      let {value, done} = await bigStore.cursorNext(cursorId);
      assert.isFalse(done);
      assert.deepEqual(value.map(e => e.rawData.value), ['v3', 'v6']);
      assert.isTrue((await bigStore.cursorNext(cursorId)).done);
    });
  });

  // These tests use data manually added to our test firebase db.
  describe('synthetic', () => {
    function getKey(manifestName) {
      let fbKey = testUrl.replace('firebase-storage-test', `synthetic-storage-data/${manifestName}`);
      return `synthetic://arc/handles/${fbKey}`;
    }

    it('simple test', async () => {
      let storage = createStorage('arc-id');
      let synth = await storage.connect('id1', null, getKey('simple-manifest'));
      let list = await synth.toList();
      assert.equal(list.length, 1);
      let handle = list[0];
      assert.equal(handle.storageKey, 'firebase://xxx.firebaseio.com/yyy');
      let type = handle.type.getContainedType();
      assert(type && type.isEntity);
      assert.equal(type.entitySchema.name, 'Thing');
      assert.deepEqual(handle.tags, ['taggy']);
    });

    it('error test', async () => {
      let storage = createStorage('arc-id');
      let synth1 = await storage.connect('not-there', null, getKey('not-there'));
      let list1 = await synth1.toList();
      assert.isEmpty(list1, 'synthetic handle list should empty for non-existent storageKey');

      let synth2 = await storage.connect('bad-manifest', null, getKey('bad-manifest'));
      let list2 = await synth2.toList();
      assert.isEmpty(list2, 'synthetic handle list should empty for invalid manifests');

      let synth3 = await storage.connect('no-recipe', null, getKey('no-recipe'));
      let list3 = await synth3.toList();
      assert.isEmpty(list3, 'synthetic handle list should empty for manifests with no active recipe');

      let synth4 = await storage.connect('no-handles', null, getKey('no-handles'));
      let list4 = await synth4.toList();
      assert.isEmpty(list4, 'synthetic handle list should empty for manifests with no handles');
    });

    it('large test', async () => {
      let storage = createStorage('arc-id');
      let synth = await storage.connect('id1', null, getKey('large-manifest'));
      let list = await synth.toList();
      assert(list.length > 0, 'synthetic handle list should not be empty');
      for (let item of list) {
        assert(item.storageKey.startsWith('firebase:'));
        assert(item.type.constructor.name == 'Type');
        if (item.tags.length > 0) {
          assert.isString(item.tags[0]);
        }
      }
    });
  });
});
