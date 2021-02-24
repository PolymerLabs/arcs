/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {RamDiskStorageKey} from '../drivers/ramdisk.js';
import {Runtime} from '../../runtime.js';
import {EntityType, Schema} from '../../../types/lib-types.js';
import {ReferenceModeStorageKey} from '../reference-mode-storage-key.js';
import {newHandle, handleForStoreInfo} from '../storage.js';
import {Particle} from '../../particle.js';
import {Exists} from '../drivers/driver.js';
import {StorageProxy} from '../storage-proxy.js';
import {CollectionHandle} from '../handle.js';
import {OrderedListField, PrimitiveField} from '../../../types/lib-types.js';
import {StoreInfo} from '../store-info.js';
import {CRDTCollectionTypeRecord} from '../../../crdt/internal/crdt-collection.js';
import {Referenceable} from '../../../crdt/lib-crdt.js';
import {DriverFactory} from '../drivers/driver-factory.js';

describe('ReferenceModeStore Integration', async () => {

  it('will store and retrieve entities through referenceModeStores (separate stores)', async () => {
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const type = new EntityType(new Schema(['AnEntity'], {foo: 'Text'})).collectionOf();
    const driverFactory = new DriverFactory();
    // Use newHandle here rather than setting up a store inside the arc, as this ensures writeHandle and readHandle
    // are on top of different storage stacks.
    const writeHandle = await newHandle(new StoreInfo({storageKey, type, id: 'write-handle'}),
      new Runtime({driverFactory}).newArc({arcName: 'testWritesArc'}));
    const readHandle = await newHandle(new StoreInfo({storageKey, type, id: 'read-handle'}),
      new Runtime({driverFactory}).newArc({arcName: 'testReadArc'}));

    readHandle.particle = new Particle();
    const returnPromise = new Promise((resolve, reject) => {

      let state = 0;

      readHandle.particle['onHandleSync'] = async (handle, model) => {
        if (state === 0) {
          assert.deepEqual(model, []);
          state = 1;
        } else {
          assert.equal(model.length, 1);
          assert.equal(model[0].foo, 'This is text in foo');
          resolve();
        }
      };
    });

    await writeHandle.addFromData({foo: 'This is text in foo'});
    return returnPromise;
  });

  it('will store and retrieve entities through referenceModeStores (shared stores)', async () => {
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = new Runtime().newArc({arcName: 'testArc'});

    const type = new EntityType(new Schema(['AnEntity'], {foo: 'Text'})).collectionOf();

    // Set up a common store and host both handles on top. This will result in one store but two different proxies.
    const store = new StoreInfo({storageKey, type, exists: Exists.MayExist, id: 'store'});
    const writeHandle = await handleForStoreInfo(store, arc);
    const readHandle = await handleForStoreInfo(store, arc);

    readHandle.particle = new Particle();
    const returnPromise = new Promise((resolve, reject) => {

      let state = 0;

      readHandle.particle['onHandleUpdate'] = async (handle, update) => {
        assert.equal(state, 1);
        assert.equal(update.added.length, 1);
        assert.equal(update.added[0].foo, 'This is text in foo');
        resolve();
      };

      readHandle.particle['onHandleSync'] = async (handle, model) => {
        assert.equal(state, 0);
        assert.deepEqual(model, []);
        state = 1;
      };
    });

    await writeHandle.addFromData({foo: 'This is text in foo'});
    return returnPromise;
  });

  it('will store and retrieve entities through referenceModeStores (shared proxies)', async () => {
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = new Runtime().newArc({arcName: 'testArc'});

    const type = new EntityType(new Schema(['AnEntity'], {foo: 'Text'})).collectionOf();

    // Set up a common store and host both handles on top. This will result in one store but two different proxies.
    const storeInfo = new StoreInfo({storageKey, type, exists: Exists.MayExist, id: 'store'});
    const activestore = await arc.storageService.getActiveStore(storeInfo);
    const proxy = new StorageProxy(arc.storageService.getStorageEndpoint(storeInfo)) as StorageProxy<CRDTCollectionTypeRecord<Referenceable>>;
    const writeHandle = new CollectionHandle('write-handle', proxy, arc.idGenerator, null, false, true, 'write-handle');
    const particle = new Particle();
    const readHandle = new CollectionHandle('read-handle', proxy, arc.idGenerator, particle, true, false, 'read-handle');

    const returnPromise = new Promise((resolve, reject) => {

      let state = 0;

      readHandle.particle['onHandleUpdate'] = async (handle, update) => {
        assert.equal(state, 1);
        assert.equal(update.added.length, 1);
        assert.equal(update.added[0].foo, 'This is text in foo');
        resolve();
      };

      readHandle.particle['onHandleSync'] = async (handle, model) => {
        assert.equal(state, 0);
        assert.deepEqual(model, []);
        state = 1;
      };
    });

    await writeHandle.addFromData({foo: 'This is text in foo'});
    return returnPromise;
  });

  it('will send an ordered list from one handle to another (separate store)', async () => {
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));

    const type = new EntityType(new Schema(['AnEntity'], {
      foo: new OrderedListField(new PrimitiveField('Text')).toLiteral()
    })).collectionOf();

    // Use newHandle here rather than setting up a store inside the arc, as this ensures writeHandle and readHandle
    // are on top of different storage stacks.
    const driverFactory = new DriverFactory();
    const writeHandle = await newHandle(new StoreInfo({storageKey, type, id: 'write-handle'}),
        new Runtime({driverFactory}).newArc({arcName: 'testWriteArc'}));
    const readHandle = await newHandle(new StoreInfo({storageKey, type, id: 'read-handle'}),
        new Runtime({driverFactory}).newArc({arcName: 'testReadArc'}));

    readHandle.particle = new Particle();
    const returnPromise = new Promise((resolve, reject) => {

      let state = 0;

      readHandle.particle['onHandleSync'] = async (handle, model) => {
        if (state === 0) {
          assert.deepEqual(model, []);
          state = 1;
        } else {
          assert.equal(model.length, 1);
          assert.deepEqual(model[0].foo, ['This', 'is', 'text', 'in', 'foo']);
          resolve();
        }
      };
    });

    await writeHandle.addFromData({foo: ['This', 'is', 'text', 'in', 'foo']});
    return returnPromise;
  });

  it('will send an ordered list from one handle to another (shared store)', async () => {
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = new Runtime().newArc({arcName: 'testArc'});

    const type = new EntityType(new Schema(['AnEntity'], {foo: {kind: 'schema-ordered-list', schema: {kind: 'schema-primitive', type: 'Text'}}})).collectionOf();

    // Set up a common store and host both handles on top. This will result in one store but two different proxies.
    const store = new StoreInfo({storageKey, type, exists: Exists.MayExist, id: 'store'});
    const writeHandle = await handleForStoreInfo(store, arc);
    const readHandle = await handleForStoreInfo(store, arc);

    readHandle.particle = new Particle();
    const returnPromise = new Promise((resolve, reject) => {

      let state = 0;

      readHandle.particle['onHandleUpdate'] = async (handle, update) => {
        assert.equal(state, 1);
        assert.equal(update.added.length, 1);
        assert.deepEqual(update.added[0].foo, ['This', 'is', 'text', 'in', 'foo']);
        resolve();
      };

      readHandle.particle['onHandleSync'] = async (handle, model) => {
        assert.equal(state, 0);
        assert.deepEqual(model, []);
        state = 1;
      };
    });

    await writeHandle.addFromData({foo: ['This', 'is', 'text', 'in', 'foo']});
    return returnPromise;
  });
});
