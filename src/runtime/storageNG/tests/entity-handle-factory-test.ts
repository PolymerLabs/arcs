/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../manifest.js';
import {EntityType, MuxType} from '../../type.js';
import {MockDirectStoreMuxer} from '../testing/test-storage.js';
import {CRDTEntityTypeRecord, Identified, CRDTEntity, EntityOpTypes} from '../../crdt/crdt-entity.js';
import {StorageProxyMuxer} from '../storage-proxy-muxer.js';
import {DirectStoreMuxer} from '../direct-store-muxer.js';
import {EntityHandleFactory} from '../entity-handle-factory.js';
import {ProxyMessageType} from '../store.js';
import {assert} from '../../../platform/chai-web.js';
import {CRDTSingleton} from '../../crdt/crdt-singleton.js';
import {Entity} from '../../entity.js';

describe('entity handle factory', () => {
  it('can produce entity handles upon request', async () => {
    const manifest = await Manifest.parse(`
    schema Foo
      value: Text
    `);
    const fooSchema = manifest.schemas.Foo;
    const fooEntityClass = Entity.createEntityClass(fooSchema, null);
    const fooEntityType = EntityType.make(['Foo'], {value: 'Text'});

    const fooEntity1 = new fooEntityClass({value: 'Text'});
    const fooMuxId1 = 'fooMuxId1';
    Entity.identify(fooEntity1, fooMuxId1, null);

    const fooEntity1CRDT = new CRDTEntity({value: new CRDTSingleton<{id: string, value: string}>()}, {});
    fooEntity1CRDT.applyOperation({type: EntityOpTypes.Set, field: 'value', value: {id: 'Text', value: 'Text'}, actor: 'me', clock: {'me': 1}});

    const fooEntity2 = new fooEntityClass({value: 'OtherText'});
    const fooMuxId2 = 'fooMuxId2';
    Entity.identify(fooEntity2, fooMuxId2, null);

    const fooEntity2CRDT = new CRDTEntity({value: new CRDTSingleton<{id: string, value: string}>()}, {});
    fooEntity2CRDT.applyOperation({type: EntityOpTypes.Set, field: 'value', value: {id: 'Text', value: 'OtherText'}, actor: 'me', clock: {'me': 1}});

    const mockDirectStoreMuxer = new MockDirectStoreMuxer<CRDTEntityTypeRecord<Identified, Identified>>();
    const storageProxyMuxer = new StorageProxyMuxer(mockDirectStoreMuxer as DirectStoreMuxer<CRDTEntityTypeRecord<Identified, Identified>>, new MuxType(fooEntityType), mockDirectStoreMuxer.storageKey.toString());
    const entityHandleProducer = new EntityHandleFactory(storageProxyMuxer);

    const entityHandle1 = entityHandleProducer.getHandle(fooMuxId1);

    // A new handle will trigger a sync request
    assert.deepEqual(mockDirectStoreMuxer.lastCapturedMessage, {type: ProxyMessageType.SyncRequest, muxId: fooMuxId1, id: 1});

    // Ensure communication between newly created entity handle and direct store muxer
    await storageProxyMuxer.onMessage({type: ProxyMessageType.ModelUpdate, model: fooEntity1CRDT.getData(), muxId: fooMuxId1});
    await storageProxyMuxer.getStorageProxy(fooMuxId1).idle();
    const entity1 = await entityHandle1.fetch();
    assert.deepEqual(entity1, fooEntity1);

    const entityHandle2 = entityHandleProducer.getHandle(fooMuxId2);
    assert.deepEqual(mockDirectStoreMuxer.lastCapturedMessage, {type: ProxyMessageType.SyncRequest, muxId: fooMuxId2, id: 1});
    await storageProxyMuxer.onMessage({type: ProxyMessageType.ModelUpdate, model: fooEntity2CRDT.getData(), muxId: fooMuxId2});
    await storageProxyMuxer.getStorageProxy(fooMuxId2).idle();
    const entity2 = await entityHandle2.fetch();
    assert.deepEqual(entity2, fooEntity2);
  });
});
