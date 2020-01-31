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
import {StorageKeyFactory} from '../storageNG/storage-key-factory.js';
import {ArcId} from '../id.js';
import {CapabilitiesResolver} from '../capabilities-resolver.js';
import {Capabilities} from '../capabilities.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {VolatileStorageKey} from '../storageNG/drivers/volatile.js';

describe('Capabilities Resolver', () => {
  it('creates storage key', () => {
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const factory = new StorageKeyFactory({arcId: ArcId.newForTest('test')});

    assert.isTrue(CapabilitiesResolver.createStorageKey(
      Capabilities.tiedToArc, factory) instanceof VolatileStorageKey);
    assert.isTrue(CapabilitiesResolver.createStorageKey(
        Capabilities.tiedToRuntime, factory) instanceof RamDiskStorageKey);
  });

  it('fails for unsupported capabilities', () => {
    const factory = new StorageKeyFactory({arcId: ArcId.newForTest('test')});
    assert.throws(
        () => CapabilitiesResolver.createStorageKey(Capabilities.tiedToRuntime, factory));

    assert.throws(() => CapabilitiesResolver.createStorageKey(
        new Capabilities(['persistent', 'tied-to-arc']), factory));
  });
});
