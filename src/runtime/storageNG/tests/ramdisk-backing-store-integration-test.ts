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
import {StorageMode, ProxyMessageType, ProxyMessage, Store} from '../store.js';
import {CRDTCountTypeRecord, CRDTCount, CountOpTypes} from '../../crdt/crdt-count.js';
import {RamDiskStorageKey, RamDiskStorageDriverProvider} from '../drivers/ramdisk.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Exists} from '../drivers/driver.js';
import {Runtime} from '../../runtime.js';
import {BackingStore} from '../backing-store.js';
import {CountType} from '../../type.js';

function assertHasModel(message: ProxyMessage<CRDTCountTypeRecord>, model: CRDTCount) {
  if (message.type === ProxyMessageType.ModelUpdate) {
    assert.deepEqual(message.model, model.getData());
  } else {
    assert.fail('message is not a ModelUpdate');
  }
}

describe('RamDisk + Backing Store Integration', async () => {
  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('will allow storage of a number of objects', async () => {
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new RamDiskStorageKey('unique');
    const baseStore = new Store<CRDTCountTypeRecord>(new CountType(), {storageKey, exists: Exists.ShouldCreate, id: 'base-store-id'});
    const store = await BackingStore.construct<CRDTCountTypeRecord>({
      storageKey,
      exists: Exists.ShouldCreate,
      type: new CountType(),
      mode: StorageMode.Backing,
      baseStore,
      versionToken: null
    });

    const count1 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    const count2 = new CRDTCount();
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'them', version: {from: 0, to: 10}, value: 15});

    const id = store.on(async (message) => true);
    assert.isTrue(await store.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count1.getData(), id, muxId: 'thing0'}));
    assert.isTrue(await store.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count2.getData(), id, muxId: 'thing1'}));

    await store.idle();
    let message: ProxyMessage<CRDTCountTypeRecord>;
    let muxId: string;
    const id2 = store.on(async (m) => {message = m; muxId = m.muxId; return true;});
    await store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id2, muxId: 'thing0'});
    assertHasModel(message, count1);
    assert.strictEqual(muxId, 'thing0');
    await store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id2, muxId: 'thing1'});
    assertHasModel(message, count2);
    assert.strictEqual(muxId, 'thing1');
    await store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id2, muxId: 'not-a-thing'});
    assertHasModel(message, new CRDTCount());
    assert.strictEqual(muxId, 'not-a-thing');
  });
});
