/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../platform/chai-web.js';
import {Arc} from '../../../arc.js';
import {Loader} from '../../../loader.js';
import {Manifest} from '../../../manifest.js';
import {PouchDbCollection} from '../../../storage/pouchdb/pouch-db-collection.js';
import {PouchDbStorage} from '../../../storage/pouchdb/pouch-db-storage.js';
import {PouchDbVariable} from '../../../storage/pouchdb/pouch-db-variable.js';
import {StorageProviderFactory} from '../../../storage/storage-provider-factory.js';
import {CallbackTracker} from '../../../testing/callback-tracker.js';
import {EntityType, ReferenceType} from '../../../type.js';

const testUrl = 'pouchdb://memory/user-test';

// TODO(lindner): run tests for remote and local variants
const testUrlReplicated = 'pouchdb://memory/user-test';

describe('pouchdb', () => {
  let lastStoreId = 0;
  function newStoreKey(name) {
    return `${testUrl}/${name}-${lastStoreId++}`;
  }

  // TODO(lindner): switch back to before()?
  beforeEach(async () => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    await PouchDbStorage.resetPouchDbStorageForTesting();
  });

  afterEach(async () => {
    // uncomment to dump the database contents after each test.
    // await PouchDbStorage.dumpDB();
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
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const value = 'Hi there' + Math.random();
      const variable = await storage.construct('test0', barType, newStoreKey('variable')) as PouchDbVariable;
      const callbackTracker = new CallbackTracker(variable, 1);

      await variable.set({id: 'test0:test', value});
      const result = await variable.get();
      assert.equal(result['value'], value);
      callbackTracker.verify();
    });

    it('resolves concurrent set', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('variable');
      const var1 = await storage.construct('test0', barType, key) as PouchDbVariable;
      const var1Callbacks = new CallbackTracker(var1, 2);

      assert.isNotNull(var1);
      const var2 = await storage.connect(
        'test0',
        barType,
        key
      ) as PouchDbVariable;
      assert.isNotNull(var2);
      const var2Callbacks = new CallbackTracker(var2, 2);

      await var1.set({id: 'id1', value: 'value1'});
      await var2.set({id: 'id2', value: 'value2'});
      const v1 = await var1.get();
      const v2 = await var2.get();
      assert.deepEqual(v1, v2);
      
      var1Callbacks.verify();
      var2Callbacks.verify();
    });

    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', barType, key1) as PouchDbVariable;
      await var1.set({id: 'id1', value: 'underlying'});

      const result = await var1.get();
      assert.equal(result['value'], 'underlying');

      assert.isTrue(var1.referenceMode);
      assert.isNotNull(var1.backingStore);

      assert.deepEqual(await var1.backingStore.get('id1'), await var1.get());
    });

    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test',  context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', new ReferenceType(barType), key1) as PouchDbVariable;
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
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const value1 = 'Hi there' + Math.random();
      const value2 = 'Goodbye' + Math.random();
      const collection = await storage.construct('test1', barType.collectionOf(), newStoreKey('collection')) as PouchDbCollection;
      await collection.store({id: 'id0', value: value1}, ['key0']);
      await collection.store({id: 'id1', value: value2}, ['key1']);
      let result = await collection.get('id0');
      assert.equal(result.value, value1);
      result = await collection.toList();
      assert.deepEqual(result, [{id: 'id0', value: value1}, {id: 'id1', value: value2}]);
    });
    it('resolves concurrent add of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', barType.collectionOf(), key) as PouchDbCollection;
      const collection2 = await storage.connect(
        'test1',
        barType.collectionOf(),
        key
      ) as PouchDbCollection;
      const c1 = collection1.store({id: 'id1', value: 'value'}, ['key3']);
      await collection2.store({id: 'id1', value: 'value'}, ['key4']);
      await c1;
      assert.deepEqual(await collection1.toList(), await collection2.toList());
    });

    it('resolves concurrent add/remove of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', barType.collectionOf(), key) as PouchDbCollection;
      const collection2 = await storage.connect(
        'test1',
        barType.collectionOf(),
        key
      ) as PouchDbCollection;
      await Promise.all([collection1.store({id: 'id1', value: 'value'}, ['key1']), collection2.store({id: 'id1', value: 'value'}, ['key2'])]);
      await Promise.all([collection1.remove('id1', ['key1']), collection2.remove('id1', ['key2'])]);
      assert.isEmpty(await collection1.toList());
      assert.isEmpty(await collection2.toList());
    });
    it('resolves concurrent add of different id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection1 = await storage.construct('test1', barType.collectionOf(), key) as PouchDbCollection;
      const collection2 = await storage.connect(
        'test1',
        barType.collectionOf(),
        key
      ) as PouchDbCollection;
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
      assert.lengthOf(await collection1.toList(), 2);
      assert.sameDeepMembers(await collection1.toList(), await collection2.toList());
    });

    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');

      const collection1 = await storage.construct('test0', barType.collectionOf(), key1) as PouchDbCollection;

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

    it('supports removeMultiple', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = new StorageProviderFactory(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collectionRemoveMultiple');
      const collection = await storage.construct('test1', barType.collectionOf(), key) as PouchDbCollection;
      const collectionCallbacks = new CallbackTracker(collection, 3);
      await collection.store({id: 'id1', value: 'value'}, ['key1']);
      await collection.store({id: 'id2', value: 'value'}, ['key2']);
      await collection.removeMultiple([
        {id: 'id1', keys: ['key1']}, {id: 'id2', keys: ['key2']}
      ]);
      assert.isEmpty(await collection.toList());
      collectionCallbacks.verify();
    });

    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');

      const collection1 = await storage.construct('test0', new ReferenceType(barType).collectionOf(), key1) as PouchDbCollection;
      const callbackTracker = new CallbackTracker(collection1, 2);

      await collection1.store({id: 'id1', storageKey: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', storageKey: 'value2'}, ['key2']);

      let result = await collection1.get('id1');
      assert.equal('value1', result.storageKey);
      result = await collection1.get('id2');
      assert.equal('value2', result.storageKey);

      assert.isFalse(collection1.referenceMode);
      assert.isNull(collection1.backingStore);
      callbackTracker.verify();
    });
    it('supports removeMultiple', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      const arc = new Arc({id: 'test', context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collection');
      const collection = await storage.construct('test1', barType.collectionOf(), key) as PouchDbCollection;
      await collection.store({id: 'id1', value: 'value'}, ['key1']);
      await collection.store({id: 'id2', value: 'value'}, ['key2']);
      await collection.removeMultiple([
        {id: 'id1', keys: ['key1']}, {id: 'id2', keys: ['key2']}
      ]);
      assert.isEmpty(await collection.toList());
    });
  });
  // TODO(lindner): add big collection tests here when implemented.
});
