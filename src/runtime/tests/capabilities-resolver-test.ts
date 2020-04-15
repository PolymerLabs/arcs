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
import {Flags} from '../flags.js';
import {CapabilitiesResolver, StorageKeyOptions} from '../capabilities-resolver.js';
import {Capabilities} from '../capabilities.js';
import {EntityType, ReferenceType} from '../type.js';
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
  function verifyReferenceModeStorageKey(key: StorageKey, expectedType: StorageKeyType) {
    assert.isTrue(key instanceof ReferenceModeStorageKey);
    const refKey = key as ReferenceModeStorageKey;
    assert.instanceOf(refKey.backingKey, expectedType);
    assert.instanceOf(refKey.storageKey, expectedType);
  }
  const entityType = new EntityType(new Schema(['Thing'], {result: 'Text'}));
  const referenceType = new ReferenceType(entityType);
  const handleId = 'h0';

  it('creates storage keys', Flags.withDefaultReferenceMode(async () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    const key = await resolver1.createStorageKey(Capabilities.tiedToArc, entityType, handleId);
    verifyReferenceModeStorageKey(key, VolatileStorageKey);
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.empty, entityType, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.tiedToRuntime, entityType, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.persistent, entityType, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.persistent, referenceType, handleId));

    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')}, [{
        protocol: RamDiskStorageKey.protocol,
        capabilities: Capabilities.tiedToRuntime,
        create: (options: StorageKeyOptions) => new RamDiskStorageKey(options.unique())
    }]);
    await assertThrowsAsync(async () => await resolver2.createStorageKey(
        Capabilities.tiedToArc, entityType, handleId));
    verifyReferenceModeStorageKey(await resolver2.createStorageKey(
        Capabilities.tiedToRuntime, entityType, handleId), RamDiskStorageKey);
    assert.instanceOf(await resolver2.createStorageKey(
        Capabilities.tiedToRuntime, referenceType, handleId), RamDiskStorageKey);

    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const resolver3 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver3.createStorageKey(
        Capabilities.tiedToArc, entityType, handleId), VolatileStorageKey);
    assert.instanceOf(await resolver3.createStorageKey(
            Capabilities.tiedToArc, referenceType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver3.createStorageKey(
        Capabilities.tiedToRuntime, entityType, handleId), RamDiskStorageKey);
    assert.instanceOf(await resolver3.createStorageKey(
            Capabilities.tiedToRuntime, referenceType, handleId), RamDiskStorageKey);

    DatabaseStorageKey.register();
    const resolver4 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver4.createStorageKey(
        Capabilities.persistent, entityType, handleId), DatabaseStorageKey);
    assert.instanceOf(await resolver4.createStorageKey(
            Capabilities.persistent, referenceType, handleId), DatabaseStorageKey);

    const resolver5 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')}, [{
        protocol: VolatileStorageKey.protocol,
        capabilities: Capabilities.empty,
        create: (options: StorageKeyOptions) => new VolatileStorageKey(options.arcId, options.unique(), options.unique())
    }]);
    verifyReferenceModeStorageKey(await resolver4.createStorageKey(
        Capabilities.empty, entityType, handleId), VolatileStorageKey);
    assert.instanceOf(await resolver4.createStorageKey(
            Capabilities.empty, referenceType, handleId), VolatileStorageKey);

    CapabilitiesResolver.reset();
    const resolver6 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver6.createStorageKey(
        Capabilities.tiedToArc, entityType, handleId), VolatileStorageKey);
    assert.instanceOf(await resolver6.createStorageKey(
            Capabilities.tiedToArc, referenceType, handleId), VolatileStorageKey);
    await assertThrowsAsync(async () => await resolver6.createStorageKey(
        Capabilities.tiedToRuntime, entityType, handleId));
    await assertThrowsAsync(async () => await resolver6.createStorageKey(
        Capabilities.tiedToRuntime, referenceType, handleId));
  }));

  it('registers and creates database key', Flags.withDefaultReferenceMode(async () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.persistent, entityType, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        Capabilities.persistent, referenceType, handleId));
    DatabaseStorageKey.register();

    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    const key = await resolver2.createStorageKey(Capabilities.persistent, entityType, handleId);
    verifyReferenceModeStorageKey(key, PersistentDatabaseStorageKey);
    const refKey = await resolver2.createStorageKey(Capabilities.persistent, referenceType, handleId);
    assert.instanceOf(refKey, PersistentDatabaseStorageKey);
  }));

  it('fails for unsupported capabilities', Flags.withDefaultReferenceMode(async () => {
    const capabilitiesResolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    await assertThrowsAsync(async () => await capabilitiesResolver.createStorageKey(
        Capabilities.tiedToRuntime, entityType, handleId));
    await assertThrowsAsync(async () => await capabilitiesResolver.createStorageKey(
        Capabilities.tiedToRuntime, referenceType, handleId));

    await assertThrowsAsync(async () => await capabilitiesResolver.createStorageKey(
        new Capabilities(['persistent', 'tied-to-arc']), entityType, handleId));
    await assertThrowsAsync(async () => await capabilitiesResolver.createStorageKey(
        new Capabilities(['persistent', 'tied-to-arc']), referenceType, handleId));
  }));

  it('verifies static creators', () => {
    assert.equal(CapabilitiesResolver.getDefaultCreators().length, 2);
    assert.isTrue(CapabilitiesResolver.getDefaultCreators().every(
        ({protocol}) => protocol === VolatileStorageKey.protocol));
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
