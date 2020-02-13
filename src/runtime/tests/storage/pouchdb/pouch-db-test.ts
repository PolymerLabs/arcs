/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import '../../../storage/pouchdb/pouch-db-provider.js';
import {assert} from '../../../../platform/chai-web.js';
import {Arc} from '../../../arc.js';
import {Loader} from '../../../../platform/loader.js';
import {Manifest, ManifestHandleRetriever} from '../../../manifest.js';
import {PouchDbCollection} from '../../../storage/pouchdb/pouch-db-collection.js';
import {PouchDbStorage} from '../../../storage/pouchdb/pouch-db-storage.js';
import {PouchDbSingleton} from '../../../storage/pouchdb/pouch-db-singleton.js';
import {StorageProviderFactory} from '../../../storage/storage-provider-factory.js';
import {CallbackTracker} from '../../../testing/callback-tracker.js';
import {EntityType, ReferenceType} from '../../../type.js';
import {Id, ArcId} from '../../../id.js';
import {Flags} from '../../../flags.js';

// TODO(lindner): run tests for remote and local variants
['pouchdb://memory/user-test/', 'pouchdb://local/user-test/'].forEach((testUrl) => {

describe('pouchdb for ' + testUrl, () => {
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

  const storageInstances: Map<Id, StorageProviderFactory> = new Map();

  function createStorage(id: Id) {
    let storage = storageInstances.get(id);
    if (!storage) {
      storage = new StorageProviderFactory(id, new ManifestHandleRetriever());
      storageInstances.set(id, storage);
    }

    return storage;
  }

  after(async () => {
    for (const s of storageInstances.values()) {
      await s.shutdown();
    }
    storageInstances.clear();
  });

  describe('variable', () => {
    before(function() {
      if (Flags.useNewStorageStack) {
        this.skip();
      }
    });

    it('supports basic construct and mutate', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const value = 'Hi there' + Math.random();
      const variable = await storage.construct('test0', barType, newStoreKey('variable')) as PouchDbSingleton;
      const callbackTracker = await CallbackTracker.create(variable, 1);

      await variable.set({id: 'test0:test', value});
      const result = await variable.fetch();
      assert.strictEqual(result['value'], value);
      callbackTracker.verify();
    });

    it('resolves concurrent set', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('variable');
      const var1 = await storage.construct('test0', barType, key) as PouchDbSingleton;
      const var1Callbacks = await CallbackTracker.create(var1, 2);

      assert.isNotNull(var1);
      const var2 = await storage.connect(
        'test0',
        barType,
        key
      ) as PouchDbSingleton;
      assert.isNotNull(var2);
      const var2Callbacks = await CallbackTracker.create(var2, 2);

      await var1.set({id: 'id1', value: 'value1'});
      await var2.set({id: 'id2', value: 'value2'});
      const v1 = await var1.fetch();
      const v2 = await var2.fetch();
      assert.deepEqual(v1, v2);

      var1Callbacks.verify();
      var2Callbacks.verify();
    });

    it('enables referenceMode by default', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);

      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', barType, key1) as PouchDbSingleton;
      await var1.set({id: 'id1', value: 'underlying'});

      const result = await var1.fetch();
      assert.strictEqual(result['value'], 'underlying');

      assert.isTrue(var1.referenceMode);
      assert.isNotNull(var1.backingStore);

      assert.deepEqual(await var1.backingStore.fetchAll('id1'), await var1.fetch());
    });

    it('supports references', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);

      const arc = new Arc({id: ArcId.newForTest('test'),  context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('varPtr');

      const var1 = await storage.construct('test0', new ReferenceType(barType), key1) as PouchDbSingleton;
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
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const value1 = 'Hi there' + Math.random();
      const value2 = 'Goodbye' + Math.random();
      const collection = await storage.construct('test1', barType.collectionOf(), newStoreKey('collection')) as PouchDbCollection;
      await collection.store({id: 'id0', value: value1}, ['key0']);
      await collection.store({id: 'id1', value: value2}, ['key1']);

      let result = await collection.fetchAll('id0');
      assert.strictEqual(result.value, value1);
      result = await collection.toList();
      assert.deepEqual(result, [{id: 'id0', value: value1}, {id: 'id1', value: value2}]);
    });
    it('resolves concurrent add of same id', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
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
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
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
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
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
          value: Text
      `);

      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');

      const collection1 = await storage.construct('test0', barType.collectionOf(), key1) as PouchDbCollection;

      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', value: 'value2'}, ['key2']);

      let result = await collection1.fetchAll('id1');
      assert.strictEqual('value1', result.value);
      result = await collection1.fetchAll('id2');
      assert.strictEqual('value2', result.value);

      assert.isTrue(collection1.referenceMode);
      assert.isNotNull(collection1.backingStore);

      assert.deepEqual(await collection1.backingStore.fetchAll('id1'), await collection1.fetchAll('id1'));
      assert.deepEqual(await collection1.backingStore.fetchAll('id2'), await collection1.fetchAll('id2'));
    });

    it('supports removeMultiple', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = new StorageProviderFactory(arc.id, new ManifestHandleRetriever());
      const barType = new EntityType(manifest.schemas.Bar);
      const key = newStoreKey('collectionRemoveMultiple');
      const collection = await storage.construct('test1', barType.collectionOf(), key) as PouchDbCollection;
      const collectionCallbacks = await CallbackTracker.create(collection, 3);
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
          value: Text
      `);

      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
      const storage = createStorage(arc.id);
      const barType = new EntityType(manifest.schemas.Bar);
      const key1 = newStoreKey('colPtr');

      const collection1 = await storage.construct('test0', new ReferenceType(barType).collectionOf(), key1) as PouchDbCollection;
      const callbackTracker = await CallbackTracker.create(collection1, 2);

      await collection1.store({id: 'id1', storageKey: 'value1'}, ['key1']);
      await collection1.store({id: 'id2', storageKey: 'value2'}, ['key2']);

      let result = await collection1.fetchAll('id1');
      assert.strictEqual('value1', result.storageKey);
      result = await collection1.fetchAll('id2');
      assert.strictEqual('value2', result.storageKey);

      assert.isFalse(collection1.referenceMode);
      assert.isNull(collection1.backingStore);
      callbackTracker.verify();
    });
    it('supports removeMultiple', async () => {
      const manifest = await Manifest.parse(`
        schema Bar
          value: Text
      `);
      const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader: new Loader()});
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
});
