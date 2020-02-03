/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../platform/chai-web.js';
import {StorageKeyFactory, StorageKeyOptions} from '../storage-key-factory.js';
import {ArcId} from '../../id.js';
import {VolatileStorageKey} from '../drivers/volatile.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../testing/test-volatile-memory-provider.js';
import {Runtime} from '../../runtime.js';
import {MockFirebaseStorageDriverProvider} from '../testing/mock-firebase.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Capabilities} from '../../capabilities.js';

describe('Storage Key Factory', () => {
  it('verifies static creators', () => {
    assert.equal(StorageKeyFactory.getDefaultCreators().size, 1);
    assert.isTrue(
        StorageKeyFactory.getDefaultCreators().has(VolatileStorageKey.protocol));
  });

  it('initializes storage keys factory', () => {
    const factory1 = new StorageKeyFactory({arcId: ArcId.newForTest('test')});
    assert.isTrue(factory1.createStorageKey(VolatileStorageKey.protocol) instanceof VolatileStorageKey);
    assert.throws(() => factory1.createStorageKey(RamDiskStorageKey.protocol));

    const factory2 = new StorageKeyFactory({arcId: ArcId.newForTest('test')},
        new Map([
          [RamDiskStorageKey.protocol, {
              capabilities: Capabilities.tiedToRuntime,
              create: ({arcId}: StorageKeyOptions) => new RamDiskStorageKey(arcId.toString())
    }]]));
    assert.throws(() => factory2.createStorageKey(VolatileStorageKey.protocol));
    assert.isTrue(factory2.createStorageKey(RamDiskStorageKey.protocol) instanceof RamDiskStorageKey);

    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const factory3 = new StorageKeyFactory({arcId: ArcId.newForTest('test')});
    assert.isTrue(factory3.createStorageKey(VolatileStorageKey.protocol) instanceof VolatileStorageKey);
    assert.isTrue(factory3.createStorageKey(RamDiskStorageKey.protocol) instanceof RamDiskStorageKey);

    StorageKeyFactory.reset();
    const factory4 = new StorageKeyFactory({arcId: ArcId.newForTest('test')});
    assert.isTrue(factory4.createStorageKey(VolatileStorageKey.protocol) instanceof VolatileStorageKey);
    assert.throws(() => factory4.createStorageKey(RamDiskStorageKey.protocol));
  });

  it('finds storage key protocols for capabilities', () => {
    const factory1 = new StorageKeyFactory({arcId: ArcId.newForTest('test')});
    assert.sameMembers([...factory1.findStorageKeyProtocols(Capabilities.tiedToArc)], ['volatile']);
    assert.equal(factory1.findStorageKeyProtocols(Capabilities.tiedToRuntime).size, 0);
    assert.equal(factory1.findStorageKeyProtocols(Capabilities.persistent).size, 0);

    DriverFactory.clearRegistrationsForTesting();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const runtime = new Runtime();
    MockFirebaseStorageDriverProvider.register(runtime.getCacheService());

    const factory2 = new StorageKeyFactory({arcId: ArcId.newForTest('test')});
    assert.sameMembers([...factory2.findStorageKeyProtocols(Capabilities.tiedToArc)], ['volatile']);
    assert.sameMembers([...factory2.findStorageKeyProtocols(Capabilities.tiedToRuntime)], ['ramdisk']);
    assert.sameMembers([...factory2.findStorageKeyProtocols(Capabilities.persistent)], ['firebase']);
  });
});
