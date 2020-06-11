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
import {Manifest} from '../manifest.js';

describe('Capabilities Resolver New', () => {
  after(() => DriverFactory.clearRegistrationsForTesting());

  type StorageKeyType = typeof VolatileStorageKey|typeof RamDiskStorageKey|typeof DatabaseStorageKey;
  function verifyReferenceModeStorageKey(key: StorageKey, expectedType: StorageKeyType) {
    assert.isTrue(key instanceof ReferenceModeStorageKey);
    const refKey = key as ReferenceModeStorageKey;
    assert.instanceOf(refKey.backingKey, expectedType,
        `Expected ${refKey.backingKey.constructor.name} to be instance of ${expectedType.name}`);
    assert.instanceOf(refKey.storageKey, expectedType,
        `Expected ${refKey.storageKey.constructor.name} to be instance of ${expectedType.name}`);
  }
  const entityType = new EntityType(new Schema(['Thing'], {result: 'Text'}));
  const referenceType = new ReferenceType(entityType);
  const handleId = 'h0';

  const unspecified = Capabilities.fromAnnotations();
  const inMemory = Capabilities.create([Persistence.inMemory()]);
  const inMemoryWithTtls = Capabilities.create([Persistence.inMemory(), Ttl.days(1)]);
  const onDisk = Capabilities.create([Persistence.onDisk()]);
  const onDiskWithTtl = Capabilities.create([Persistence.onDisk(), Ttl.minutes(30)]);

  it('fails creating keys with no factories', Flags.withDefaultReferenceMode(async () => {
    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    // Verify storage keys for none of the capabilities cannot be created.
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        unspecified, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        inMemory, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        inMemoryWithTtls, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        onDisk, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        onDiskWithTtl, entityType, handleId));
  }));

  it('creates volatile keys', Flags.withDefaultReferenceMode(async () => {
    // Register volatile storage key factory.
    // Verify only volatile (in-memory, no ttl) storage key can be created.
    VolatileStorageKey.register();
    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        unspecified, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        inMemory, entityType, handleId), VolatileStorageKey);
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        inMemoryWithTtls, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        onDisk, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        onDiskWithTtl, entityType, handleId));
  }));

  it('creates keys with db only factories', Flags.withDefaultReferenceMode(async () => {
    DatabaseStorageKey.register();
    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        unspecified, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        inMemory, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        onDisk, entityType, handleId), PersistentDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        onDiskWithTtl, entityType, handleId), PersistentDatabaseStorageKey);
  }));

  it('creates keys with volatile and db factories', Flags.withDefaultReferenceMode(async () => {
    // Register database storage key factories. Verify all storage keys created as expected.
    VolatileStorageKey.register();
    DatabaseStorageKey.register();
    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        unspecified, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        inMemory, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        onDisk, entityType, handleId), PersistentDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        onDiskWithTtl, entityType, handleId), PersistentDatabaseStorageKey);
  }));

  it('creates keys with custom factory', Flags.withDefaultReferenceMode(async () => {
    // Register volatile factory, pass in-memory database in constructor.
    VolatileStorageKey.register();
    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test'), factories: [new MemoryDatabaseStorageKeyFactory()]});
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
      unspecified, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
      inMemory, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
      inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        onDisk, entityType, handleId));
    await assertThrowsAsync(async () => await resolver.createStorageKey(
        onDiskWithTtl, entityType, handleId));
  }));

  it('creates keys for recipe with volatile and db factories', Flags.withDefaultReferenceMode(async () => {
    VolatileStorageKey.register();
    DatabaseStorageKey.register();
    const manifestStr = `
        recipe
          h0: create
          h1: create @ttl('2h')
          h2: create @persistent
          h3: create @persistent @ttl('30m')
          h4: create @queryable @ttl('30m')
    `;
    const recipe = (await Manifest.parse(manifestStr)).recipes[0];

    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    const verifyHandleKey = async (handle, expectedStorageKeyType) => {
        const fromOldCapabilities = Capabilities.fromOldCapabilities(handle.capabilities, handle.ttl);
        verifyReferenceModeStorageKey(await resolver.createStorageKey(
            fromOldCapabilities, entityType, handleId), expectedStorageKeyType);
        const capabilities = Capabilities.fromAnnotations(handle.annotations);
        verifyReferenceModeStorageKey(await resolver.createStorageKey(
            capabilities, entityType, handleId), expectedStorageKeyType);
    };
    await verifyHandleKey(recipe.handles[0], VolatileStorageKey);
    await verifyHandleKey(recipe.handles[1], MemoryDatabaseStorageKey);
    await verifyHandleKey(recipe.handles[2], PersistentDatabaseStorageKey);
    await verifyHandleKey(recipe.handles[3], PersistentDatabaseStorageKey);
    await verifyHandleKey(recipe.handles[4], MemoryDatabaseStorageKey);
  }));
});
