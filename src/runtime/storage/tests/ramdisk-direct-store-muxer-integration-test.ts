/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {ProxyMessageType, ProxyMessage} from '../store-interface.js';
import {RamDiskStorageKey} from '../drivers/ramdisk.js';
import {Exists} from '../drivers/driver.js';
import {DirectStoreMuxer} from '../direct-store-muxer.js';
import {EntityType, MuxType} from '../../../types/lib-types.js';
import {Manifest} from '../../manifest.js';
import {CRDTMuxEntity} from '../storage.js';
import {Identified, CRDTEntity, EntityOpTypes, CRDTSingleton} from '../../../crdt/lib-crdt.js';
import {StoreInfo} from '../store-info.js';

function assertHasModel(message: ProxyMessage<CRDTMuxEntity>, model: CRDTEntity<Identified, Identified>) {
  if (message.type === ProxyMessageType.ModelUpdate) {
    assert.deepEqual(message.model, model.getData());
  } else {
    assert.fail('message is not a ModelUpdate');
  }
}

describe('RamDisk + Direct Store Muxer Integration', async () => {
  it('will allow storage of a number of objects', async () => {
    const manifest = await Manifest.parse(`
      schema Simple
        txt: Text
    `);
    const simpleSchema = manifest.schemas.Simple;

    const storageKey = new RamDiskStorageKey('unique');
    const type = new MuxType(new EntityType(simpleSchema));
    const storeInfo = new StoreInfo<MuxType<EntityType>>({
        storageKey, exists: Exists.ShouldCreate, type, id: 'base-store-id'});
    const store = await DirectStoreMuxer.construct<Identified, Identified, CRDTMuxEntity>({
      storageKey,
      exists: Exists.ShouldCreate,
      type: new MuxType(new EntityType(simpleSchema)),
      storeInfo,
    });


    const entity1 = new CRDTEntity({txt: new CRDTSingleton<{id: string, value: string}>()}, {});
    entity1.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'text1', value: 'text1'}, actor: 'me', versionMap: {'me': 1}});

    const entity2 = new CRDTEntity({txt: new CRDTSingleton<{id: string, value: string}>()}, {});
    entity2.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'text2', value: 'text2'}, actor: 'me', versionMap: {'me': 1}});

    const id = store.on(async (message) => {return;});
    await store.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: entity1.getData(), id, muxId: 'thing0'});
    await store.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: entity2.getData(), id, muxId: 'thing1'});

    await store.idle();

    let message: ProxyMessage<CRDTMuxEntity>;
    let muxId: string;
    const id2 = store.on(async (m) => {message = m; muxId = m.muxId;});
    await store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id2, muxId: 'thing0'});
    assertHasModel(message, entity1);
    assert.strictEqual(muxId, 'thing0');
    await store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id2, muxId: 'thing1'});
    assertHasModel(message, entity2);
    assert.strictEqual(muxId, 'thing1');
    await store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id2, muxId: 'not-a-thing'});
    assertHasModel(message, new CRDTEntity({txt: new CRDTSingleton<{id: string, value: string}>()}, {}));
    assert.strictEqual(muxId, 'not-a-thing');
  });
});
