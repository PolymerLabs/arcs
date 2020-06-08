/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Flags} from '../flags.js';
import {VolatileStorageKey} from '../storageNG/drivers/volatile.js';
import {RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {DatabaseStorageKey, MemoryDatabaseStorageKey, PersistentDatabaseStorageKey, MemoryDatabaseStorageKeyFactory} from '../storageNG/database-storage-key.js';
import {StorageKey} from '../storageNG/storage-key.js';
import {ReferenceModeStorageKey} from '../storageNG/reference-mode-storage-key.js';
import {EntityType, ReferenceType} from '../type.js';
import {CapabilitiesResolver} from '../capabilities-resolver-new.js';
import {ArcId} from '../id.js';
import {Capabilities, Persistence, Ttl} from '../capabilities-new.js';
import {Schema} from '../schema.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {DriverFactory} from '../storageNG/drivers/driver-factory.js';

describe('Capabilities Resolver New', () => {
  after(() => DriverFactory.clearRegistrationsForTesting());

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

  it('tests', Flags.withDefaultReferenceMode(async () => {
    const resolver0 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    const inMemory = Capabilities.unrestricted().restrict(Persistence.inMemory());
    const inMemoryWithTtls = Capabilities.unrestricted().restrictAll([Persistence.inMemory(), Ttl.days(1)]);
    const onDisk = Capabilities.unrestricted().restrict(Persistence.onDisk());
    const onDiskWithTtl = Capabilities.unrestricted().restrictAll([Persistence.onDisk(), Ttl.minutes(30)]);
    // Verify storage keys for none of the capabilities cannot be created.
    await assertThrowsAsync(async () => await resolver0.createStorageKey(
        inMemory, entityType, handleId));
    await assertThrowsAsync(async () => await resolver0.createStorageKey(
        inMemoryWithTtls, entityType, handleId));
    await assertThrowsAsync(async () => await resolver0.createStorageKey(
        onDisk, entityType, handleId));
    await assertThrowsAsync(async () => await resolver0.createStorageKey(
        onDiskWithTtl, entityType, handleId));

    // Register volatile storage key factory.
    // Verify only volatile (in-memory, no ttl) storage key can be created.
    VolatileStorageKey.register();
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver1.createStorageKey(
        inMemory, entityType, handleId), VolatileStorageKey);
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        inMemoryWithTtls, entityType, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        onDisk, entityType, handleId));
    await assertThrowsAsync(async () => await resolver1.createStorageKey(
        onDiskWithTtl, entityType, handleId));

    // Register database storage key factories. Verify all storage keys created as expected.
    DatabaseStorageKey.register();
    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver2.createStorageKey(
        inMemory, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver2.createStorageKey(
        inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver2.createStorageKey(
        onDisk, entityType, handleId), PersistentDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver2.createStorageKey(
        onDiskWithTtl, entityType, handleId), PersistentDatabaseStorageKey);

    // Register volatile factory, pass in-memory database in constructor.
    CapabilitiesResolver.reset();
    VolatileStorageKey.register();
    const resolver3 = new CapabilitiesResolver({arcId: ArcId.newForTest('test'), factories: [new MemoryDatabaseStorageKeyFactory()]});
    verifyReferenceModeStorageKey(await resolver3.createStorageKey(
      inMemory, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver3.createStorageKey(
      inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    await assertThrowsAsync(async () => await resolver3.createStorageKey(
        onDisk, entityType, handleId));
    await assertThrowsAsync(async () => await resolver3.createStorageKey(
        onDiskWithTtl, entityType, handleId));
  }));
});
