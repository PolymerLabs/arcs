/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {ArcId} from '../id.js';
import {CapabilitiesResolver, StorageKeyOptions} from '../capabilities-resolver.js';
import {Capabilities} from '../capabilities.js';
import {Schema} from '../schema.js';
import {ReferenceModeStorageKey} from '../storageNG/reference-mode-storage-key.js';
import {StorageKey} from '../storageNG/storage-key.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {DatabaseStorageKey, PersistentDatabaseStorageKey} from '../storageNG/database-storage-key.js';
import {VolatileStorageKey} from '../storageNG/drivers/volatile.js';
import {DriverFactory} from '../storageNG/drivers/driver-factory.js';
import {Runtime} from '../runtime.js';
import {MockFirebaseStorageDriverProvider} from '../storageNG/testing/mock-firebase.js';
import {assertThrowsAsync} from '../../testing/test-util.js';

describe('Capabilities Resolver', () => {
  type StorageKeyType = typeof VolatileStorageKey|typeof RamDiskStorageKey|typeof DatabaseStorageKey;
  function verifyStorageKey(key: StorageKey, expectedType: StorageKeyType) {
    assert.isTrue(key instanceof ReferenceModeStorageKey);
    const refKey = key as ReferenceModeStorageKey;
    assert.instanceOf(refKey.backingKey, expectedType);
    assert.instanceOf(refKey.storageKey, expectedType);
  }
  const schema = new Schema(['Thing'], {result: 'Text'});
  const handleId = 'h0';

  it('creates storage keys', async () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    const key = await resolver1.createStorageKey(Capabilities.tiedToArc, schema, handleId);
    verifyStorageKey(key, VolatileStorageKey);
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.tiedToRuntime, schema, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.persistent, schema, handleId));

    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')},
        new Map([
            [RamDiskStorageKey.protocol, {
                capabilities: Capabilities.tiedToRuntime,
                create: (options: StorageKeyOptions) => new RamDiskStorageKey(options.unique())
    }]]));
    await assertThrowsAsync(async () => await resolver2.createStorageKey(
        Capabilities.tiedToArc, schema, handleId));
    verifyStorageKey(await resolver2.createStorageKey(
        Capabilities.tiedToRuntime, schema, handleId), RamDiskStorageKey);

    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const resolver3 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyStorageKey(await resolver3.createStorageKey(
        Capabilities.tiedToArc, schema, handleId), VolatileStorageKey);
    verifyStorageKey(await resolver3.createStorageKey(
        Capabilities.tiedToRuntime, schema, handleId), RamDiskStorageKey);

    DatabaseStorageKey.register();
    const resolver4 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyStorageKey(await resolver4.createStorageKey(
        Capabilities.persistent, schema, handleId), DatabaseStorageKey);

    CapabilitiesResolver.reset();
    const resolver5 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyStorageKey(await resolver5.createStorageKey(
        Capabilities.tiedToArc, schema, handleId), VolatileStorageKey);
    await assertThrowsAsync(async () => await resolver5.createStorageKey(
        Capabilities.tiedToRuntime, schema, handleId));
});

  it('registers and creates database key', async () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.persistent, schema, handleId));
    DatabaseStorageKey.register();

    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    const key = await resolver2.createStorageKey(Capabilities.persistent, schema, handleId);
    verifyStorageKey(key, PersistentDatabaseStorageKey);
  });

  it('fails for unsupported capabilities', async () => {
    const capabilitiesResolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    await assertThrowsAsync(async () => await capabilitiesResolver.createStorageKey(
        Capabilities.tiedToRuntime, schema, handleId));

    await assertThrowsAsync(async () => await capabilitiesResolver.createStorageKey(
        new Capabilities(['persistent', 'tied-to-arc']), schema, handleId));
  });

  it('verifies static creators', () => {
    assert.equal(CapabilitiesResolver.getDefaultCreators().size, 1);
    assert.isTrue(
        CapabilitiesResolver.getDefaultCreators().has(VolatileStorageKey.protocol));
  });

  it('finds storage key protocols for capabilities', () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.sameMembers([...resolver1.findStorageKeyProtocols(Capabilities.tiedToArc)], ['volatile']);
    assert.equal(resolver1.findStorageKeyProtocols(Capabilities.tiedToRuntime).size, 0);
    assert.equal(resolver1.findStorageKeyProtocols(Capabilities.persistent).size, 0);

    DriverFactory.clearRegistrationsForTesting();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const runtime = new Runtime();
    MockFirebaseStorageDriverProvider.register(runtime.getCacheService());

    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.tiedToArc)], ['volatile']);
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.tiedToRuntime)], ['ramdisk']);
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.persistent)], ['firebase']);
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.queryable)], ['firebase']);
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.persistentQueryable)], ['firebase']);
  });
});
