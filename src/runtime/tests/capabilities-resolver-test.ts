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
import {VolatileStorageKey} from '../storage/drivers/volatile.js';
import {RamDiskStorageKey} from '../storage/drivers/ramdisk.js';
import {DatabaseStorageKey, MemoryDatabaseStorageKey, PersistentDatabaseStorageKey, MemoryDatabaseStorageKeyFactory, PersistentDatabaseStorageKeyFactory} from '../storage/database-storage-key.js';
import {StorageKey} from '../storage/storage-key.js';
import {ReferenceModeStorageKey} from '../storage/reference-mode-storage-key.js';
import {EntityType, Schema} from '../../types/lib-types.js';
import {CapabilitiesResolver} from '../capabilities-resolver.js';
import {ArcId} from '../id.js';
import {Capabilities, Persistence, Ttl, Shareable, DeletePropagation} from '../capabilities.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {Runtime} from '../runtime.js';

describe('Capabilities Resolver', () => {

  let runtime;
  beforeEach(() => {
    runtime = new Runtime();
  });

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
  const handleId = 'h0';

  const unspecified = Capabilities.fromAnnotations();
  const inMemory = Capabilities.create([Persistence.inMemory()]);
  const inMemoryWithTtls = Capabilities.create([Persistence.inMemory(), Ttl.days(1)]);
  const inMemoryWithDeleteProp = Capabilities.create([Persistence.inMemory(), new DeletePropagation(true)]);
  const onDisk = Capabilities.create([Persistence.onDisk()]);
  const onDiskWithTtl = Capabilities.create([Persistence.onDisk(), Ttl.minutes(30)]);

  it('fails creating keys with no factories', Flags.withDefaultReferenceMode(async () => {
    const resolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    // Verify storage keys for none of the capabilities cannot be created.
    await assertThrowsAsync(async () => resolver.createStorageKey(unspecified, entityType, handleId));
    await assertThrowsAsync(async () => resolver.createStorageKey(inMemory, entityType, handleId));
    await assertThrowsAsync(async () => resolver.createStorageKey(inMemoryWithTtls, entityType, handleId));
    await assertThrowsAsync(async () => resolver.createStorageKey(onDisk, entityType, handleId));
    await assertThrowsAsync(async () => resolver.createStorageKey(onDiskWithTtl, entityType, handleId));
  }));

  it('creates volatile keys', Flags.withDefaultReferenceMode(async () => {
    // Register volatile storage key factory.
    // Verify only volatile (in-memory, no ttl) storage key can be created.
    const capabilitiesResolver = runtime.getCapabilitiesResolver(ArcId.newForTest('test'));
    const createKey = capabilitiesResolver.createStorageKey.bind(capabilitiesResolver);
    verifyReferenceModeStorageKey(await createKey(unspecified, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await createKey(inMemory, entityType, handleId), VolatileStorageKey);
    await assertThrowsAsync(async () => createKey(inMemoryWithTtls, entityType, handleId));
    await assertThrowsAsync(async () => createKey(onDisk, entityType, handleId));
    await assertThrowsAsync(async () => createKey(onDiskWithTtl, entityType, handleId));
    await assertThrowsAsync(async () => createKey(inMemoryWithDeleteProp, entityType, handleId));
  }));

  it('creates keys with db only factories', Flags.withDefaultReferenceMode(async () => {
    const resolver = new CapabilitiesResolver({
      arcId: ArcId.newForTest('test'),
      factories: [new PersistentDatabaseStorageKeyFactory(), new MemoryDatabaseStorageKeyFactory()]
    });
    const createKey = resolver.createStorageKey.bind(resolver);
    verifyReferenceModeStorageKey(await createKey(unspecified, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await createKey(inMemory, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await createKey(inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await createKey(inMemoryWithDeleteProp, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await createKey(onDisk, entityType, handleId), PersistentDatabaseStorageKey);
    verifyReferenceModeStorageKey(await createKey(onDiskWithTtl, entityType, handleId), PersistentDatabaseStorageKey);
  }));

  it('creates keys with volatile and db factories', Flags.withDefaultReferenceMode(async () => {
    // Register database storage key factories. Verify all storage keys created as expected.
    DatabaseStorageKey.register(runtime);
    const resolver = runtime.getCapabilitiesResolver(ArcId.newForTest('test'));
    const verify = async (capabilities, type, handleId, keyClass) => verifyReferenceModeStorageKey(
      await resolver.createStorageKey(capabilities, type, handleId), keyClass);
    await verify(unspecified, entityType, handleId, VolatileStorageKey);
    await verify(Capabilities.create([new Shareable(false)]), entityType, handleId, VolatileStorageKey);
    await verify(Capabilities.create([new Shareable(true)]), entityType, handleId, RamDiskStorageKey);
    await verify(inMemory, entityType, handleId, VolatileStorageKey);
    await verify(inMemoryWithTtls, entityType, handleId, MemoryDatabaseStorageKey);
    await verify(onDisk, entityType, handleId, PersistentDatabaseStorageKey);
    await verify(onDiskWithTtl, entityType, handleId, PersistentDatabaseStorageKey);
  }));

  it('creates keys with custom factory', Flags.withDefaultReferenceMode(async () => {
    const resolver = runtime.getCapabilitiesResolver(
        ArcId.newForTest('test'), [new MemoryDatabaseStorageKeyFactory()]);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(unspecified, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(inMemory, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(inMemoryWithTtls, entityType, handleId), MemoryDatabaseStorageKey);
    await assertThrowsAsync(async () => resolver.createStorageKey(onDisk, entityType, handleId));
    await assertThrowsAsync(async () => resolver.createStorageKey(onDiskWithTtl, entityType, handleId));
  }));

  it('creates keys for recipe with volatile and db factories', Flags.withDefaultReferenceMode(async () => {
    DatabaseStorageKey.register(runtime);
    const manifestStr = `
        recipe
          h0: create
          h1: create @ttl('2h')
          h2: create @persistent
          h3: create @persistent @ttl('30m')
          h4: create @queryable @ttl('30m')
    `;
    const recipe = (await runtime.parse(manifestStr)).recipes[0];
    const resolver = runtime.getCapabilitiesResolver(ArcId.newForTest('test'));

    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        recipe.handles[0].capabilities, entityType, handleId), VolatileStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        recipe.handles[1].capabilities, entityType, handleId), MemoryDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        recipe.handles[2].capabilities, entityType, handleId), PersistentDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        recipe.handles[3].capabilities, entityType, handleId), PersistentDatabaseStorageKey);
    verifyReferenceModeStorageKey(await resolver.createStorageKey(
        recipe.handles[4].capabilities, entityType, handleId), MemoryDatabaseStorageKey);
  }));
});
