/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {MockHierarchicalStorageKey, MockStorageDriverProvider} from '../testing/test-storage.js';
import {DirectStoreMuxer} from '../direct-store-muxer.js';
import {MuxType, EntityType, Schema} from '../../../types/lib-types.js';
import {Exists} from '../drivers/driver.js';
import {ProxyMessageType} from '../store-interface.js';
import {Identified, CRDTEntityTypeRecord, CRDTEntity, EntityOpTypes, CRDTSingleton} from '../../../crdt/lib-crdt.js';
import {CRDTMuxEntity} from '../storage.js';
import {assert} from '../../../platform/chai-web.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {DirectStore} from '../direct-store.js';
import {StoreInfo} from '../store-info.js';
import {StorageService} from '../storage-service.js';
import {Runtime} from '../../runtime.js';

/* eslint-disable no-async-promise-executor */

const schema = new Schema(['Thing'], {name: 'Text', age: 'Number'});
const muxType = new MuxType(new EntityType(schema));

const testKey = new MockHierarchicalStorageKey();
let storageService: StorageService;

describe('Direct Store Muxer', async () => {
  beforeEach(() => {
    const runtime = new Runtime();
    runtime.driverFactory.register(new MockStorageDriverProvider());
    storageService = runtime.storageService;
  });

  it('can facilitate communication between a direct store and a storage proxy muxer', async () => {
    const dsm = await storageService.getActiveStore(new StoreInfo({
      id: 'base-store-id', exists: Exists.ShouldCreate, type: muxType, storageKey: testKey}));

    const spmListener = new Promise(async (resolve) => {
      const id = await dsm.on(async msg => {
        assert.equal(ProxyMessageType.ModelUpdate, msg.type);
        assert.equal(id, msg.id);
        resolve();
      });
    });

    await dsm['setupStore']('an-id', 1);

    // simulate a sync request from a storage proxy muxer with id 1.
    // This is expected to trigger a model update message sent to the storage proxy muxer
    await dsm.onProxyMessage({type: ProxyMessageType.SyncRequest, id: 1, muxId: 'an-id'});
    await spmListener;
  });

  it('will propagate model updates from a direct store to all listeners', async () => {
    const dsm = await storageService.getActiveStore(new StoreInfo({
        id: 'base-store-id', exists: Exists.ShouldCreate, type: muxType, storageKey: testKey})) as DirectStoreMuxer<Identified, Identified, CRDTMuxEntity>;
    const entityCRDT = new CRDTEntity<{name: {id: string}, age: {id: string, value: number}}, {}>({name: new CRDTSingleton<{id: string}>(), age: new CRDTSingleton<{id: string, value: number}>()}, {});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'age', value: {id: '42', value: 42}, actor: 'me', versionMap: {['me']: 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'name', value: {id: 'bob'}, actor: 'me', versionMap: {['me']: 1}});

    const spm1Listener = new Promise(async (resolve) => {
      await dsm.on(async msg => {
        if (msg.type === ProxyMessageType.ModelUpdate) {
          assert.deepStrictEqual(msg.model, entityCRDT.getData());
          resolve();
        }
      });
    });
    const spm2Listener = new Promise(async (resolve) => {
      await dsm.on(async msg => {
        if (msg.type === ProxyMessageType.ModelUpdate) {
          assert.deepStrictEqual(msg.model, entityCRDT.getData());
          resolve();
        }
      });
    });

    const storeRecord = await dsm['setupStore']('an-id', 1);
    await dsm['createListenerForStore'](storeRecord.store, 'an-id', 2);

    if (dsm.stores['an-id'].type === 'pending') {
      await dsm.stores['an-id']['promise'];
    }
    const ds = dsm.stores['an-id']['store'] as DirectStore<CRDTEntityTypeRecord<{name: {id: string}, age: {id: string, value: number}}, {}>>;

    await ds.onReceive(entityCRDT.getData(), 1);

    await spm1Listener;
    await spm2Listener;
  });

  it('will only send a model update response from requesting proxy muxer', async () => {
    const dsm = await storageService.getActiveStore(new StoreInfo({
        id: 'base-store-id', exists: Exists.ShouldCreate, type: muxType, storageKey: testKey}));

    return new Promise(async (resolve) => {
      // storage proxy muxer that will request a model update
      const id1 = dsm.on(async msg => {
        assert.equal(msg.type, ProxyMessageType.ModelUpdate);
        resolve();
      });

      // another storage proxy muxer
      const id2 = dsm.on(msg => { throw new Error(); });

      const storeRecord = await dsm['setupStore']('an-id', id1);
      await dsm['createListenerForStore'](storeRecord.store, 'an-id', id2);

      await dsm.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id1, muxId: 'an-id'});
    });
  });

  it('will not send model update to the listener who updated the model', async () => {
    const dsm = await storageService.getActiveStore(new StoreInfo({
        id: 'base-store-id', exists: Exists.ShouldCreate, type: muxType, storageKey: testKey}));

    const entityCRDT = new CRDTEntity<{name: {id: string}, age: {id: string, value: number}}, {}>({name: new CRDTSingleton<{id: string}>(), age: new CRDTSingleton<{id: string, value: number}>()}, {});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'age', value: {id: '42', value: 42}, actor: 'me', versionMap: {['me']: 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'name', value: {id: 'bob'}, actor: 'me', versionMap: {['me']: 1}});

    return new Promise(async (resolve, reject) => {
      // storage proxy muxer that will receive a model update
      const id1 = dsm.on(async msg => {
        assert.equal(msg.type, ProxyMessageType.ModelUpdate);
        resolve();
      });

      // storage proxy muxer that will send a model update
      const id2 = dsm.on(msg => { throw new Error('unexpected proxy message'); });

      const storeRecord = await dsm['setupStore']('an-id', id1);
      const otherId = await dsm['createListenerForStore'](storeRecord.store, 'an-id', id2);
      storeRecord['idMap'].set(id2, otherId);

      await dsm.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: entityCRDT.getData(), id: id2, muxId: 'an-id'});
    });
  });
});
