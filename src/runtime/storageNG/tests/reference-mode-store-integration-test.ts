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
import {RamDiskStorageKey, RamDiskStorageDriverProvider} from '../drivers/ramdisk.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Runtime} from '../../runtime.js';
import {EntityType} from '../../type.js';
import {ReferenceModeStorageKey} from '../reference-mode-storage-key.js';
import {newHandle, handleForStore, newStore} from '../storage-ng.js';
import {Schema} from '../../schema.js';
import {Particle} from '../../particle.js';
import { Exists } from '../drivers/driver.js';
import { StorageProxy } from '../storage-proxy.js';
import { CollectionHandle } from '../handle.js';

describe('ReferenceModeStore Integration', async () => {

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('will store and retrieve entities through referenceModeStores (separate stores)', async () => {
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = Runtime.newForNodeTesting().newArc('testArc');

    const type = new EntityType(new Schema(['AnEntity'], {foo: 'Text'})).collectionOf();

    // Use newHandle here rather than setting up a store inside the arc, as this ensures writeHandle and readHandle
    // are on top of different storage stacks.
    const writeHandle = await newHandle(type, storageKey, arc, {id: 'write-handle'});
    const readHandle = await newHandle(type, storageKey, arc, {id: 'read-handle'});

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
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = Runtime.newForNodeTesting().newArc('testArc');

    const type = new EntityType(new Schema(['AnEntity'], {foo: 'Text'})).collectionOf();

    // Set up a common store and host both handles on top. This will result in one store but two different proxies.
    const store = newStore(type, {storageKey, id: 'store', exists: Exists.MayExist});
    const writeHandle = await handleForStore(store, arc);
    const readHandle = await handleForStore(store, arc);

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
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = Runtime.newForNodeTesting().newArc('testArc');

    const type = new EntityType(new Schema(['AnEntity'], {foo: 'Text'})).collectionOf();

    // Set up a common store and host both handles on top. This will result in one store but two different proxies.
    const store = newStore(type, {storageKey, id: 'store', exists: Exists.MayExist});
    const activestore = await store.activate();
    const proxy = new StorageProxy('proxy', activestore, type, storageKey.toString());
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
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = Runtime.newForNodeTesting().newArc('testArc');

    const type = new EntityType(new Schema(['AnEntity'], {foo: {kind: 'schema-ordered-list', schema: {kind: 'schema-primitive', type: 'Text'}}})).collectionOf();

    // Use newHandle here rather than setting up a store inside the arc, as this ensures writeHandle and readHandle
    // are on top of different storage stacks.
    const writeHandle = await newHandle(type, storageKey, arc, {id: 'write-handle'});
    const readHandle = await newHandle(type, storageKey, arc, {id: 'read-handle'});

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
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = Runtime.newForNodeTesting().newArc('testArc');

    const type = new EntityType(new Schema(['AnEntity'], {foo: {kind: 'schema-ordered-list', schema: {kind: 'schema-primitive', type: 'Text'}}})).collectionOf();

    // Set up a common store and host both handles on top. This will result in one store but two different proxies.
    const store = newStore(type, {storageKey, id: 'store', exists: Exists.MayExist});
    const writeHandle = await handleForStore(store, arc);
    const readHandle = await handleForStore(store, arc);

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