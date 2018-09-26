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
import 'chai/register-assert';

import {PouchDbStorage} from '../ts-build/storage/pouchdb/pouch-db-storage.js';

const testUrl = 'pouchdb://memory/user-test';

// TODO(lindner): run tests for remote and local variants
const testUrlReplicated = 'pouchdb://memory/user-test';

describe('pouchdb', function() {
  this.timeout(10000); // eslint-disable-line no-invalid-this

  let lastStoreId = 0;
  function newStoreKey(name) {
    return `${testUrl}/${name}-${lastStoreId++}`;
  }

  // TODO(lindner): switch back to before()?
  beforeEach(async () => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    await PouchDbStorage.resetPouchDbStorageForTesting(testUrl);
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
      assert.equal(result.value, value);
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
      assert.isNotNull(var1);
      let var2 = await storage.connect(
        'test0',
        BarType,
        key
      );
      assert.isNotNull(var2);

      await var1.set({id: 'id1', value: 'value1'});
      await var2.set({id: 'id2', value: 'value2'});
      const v1 = await var1.get();
      const v2 = await var2.get();
      assert.deepEqual(v1, v2);
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
      await collection.store({id: 'test0:test0', value: value1}, ['key0']);
      await collection.store({id: 'test0:test1', value: value2}, ['key1']);
      let result = await collection.get('test0:test0');
      assert.equal(result.value, value1);
      result = await collection.toList();
      assert.lengthOf(result, 2);
      assert.equal(result[0].value, value1);
      assert.equal(result[0].id, 'test0:test0');
      assert.equal(result[1].value, value2);
      // TODO(lindner): firebase tests say that this should  be test1:test1 instead
      assert.equal(result[1].id, 'test0:test1');
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
      let collection2 = await storage.connect(
        'test1',
        BarType.collectionOf(),
        key
      );
      const c1 = collection1.store({id: 'id1', value: 'value'}, ['key3']);
      await collection2.store({id: 'id1', value: 'value'}, ['key4']);
      await c1;
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
      let collection2 = await storage.connect(
        'test1',
        BarType.collectionOf(),
        key
      );
      await Promise.all([collection1.store({id: 'id1', value: 'value'}, ['key1']), collection2.store({id: 'id1', value: 'value'}, ['key2'])]);
      await Promise.all([collection1.remove('id1', ['key1']), collection2.remove('id1', ['key2'])]);
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
      let collection2 = await storage.connect(
        'test1',
        BarType.collectionOf(),
        key
      );
      await collection1.store({id: 'id1', value: 'value1'}, ['key1']);
      await collection2.store({id: 'id2', value: 'value2'}, ['key2']);
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
  });
  // TODO(lindner): add big collection tests here when implemented.
});
