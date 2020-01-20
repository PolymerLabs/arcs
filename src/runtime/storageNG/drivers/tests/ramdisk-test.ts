/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../ramdisk.js';
import {VolatileMemory, VolatileStorageKey} from '../volatile.js';
import {assert} from '../../../../platform/chai-web.js';
import {ArcId} from '../../../id.js';
import {Capabilities} from '../../../capabilities.js';
import {TestVolatileMemoryProvider} from '../../../testing/test-volatile-memory-provider.js';
import {StorageKeyFactory} from '../../storage-key-factory.js';

// NOTE: Only testing RamDiskStorageDriverProvider. There is no RamDiskDriver
// (it uses VolatileDriver instead, which is already tested).
describe('RamDiskStorageDriverProvider', () => {
  it('supports RamDiskStorageKeys', () => {
    const provider = new RamDiskStorageDriverProvider(new TestVolatileMemoryProvider());
    const storageKey = new RamDiskStorageKey('unique');
    assert.isTrue(provider.willSupport(storageKey));
  });

  it('does not support VolatileStorageKeys', () => {
    const provider = new RamDiskStorageDriverProvider(new TestVolatileMemoryProvider());
    const storageKey = new VolatileStorageKey(ArcId.newForTest('arc'), 'unique');
    assert.isFalse(provider.willSupport(storageKey));
  });

  it('creates ramdisk storage key by factory', () => {
    RamDiskStorageDriverProvider.register(new TestVolatileMemoryProvider());

    const arcId = ArcId.newForTest('some-other-arc');
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const ramdiskKey = StorageKeyFactory.createStorageKey(
        Capabilities.tiedToRuntime, volatileKey, arcId);
    assert.instanceOf(ramdiskKey, RamDiskStorageKey);
    assert.equal(RamDiskStorageKey.fromString(ramdiskKey.toString()).toString(), ramdiskKey.toString());

    const newRamdiskKey = StorageKeyFactory.createStorageKey(
        Capabilities.tiedToRuntime, ramdiskKey, arcId);
    assert.instanceOf(newRamdiskKey, RamDiskStorageKey);
    assert.equal(newRamdiskKey.toString(), ramdiskKey.toString());

    const newVolatileKey = StorageKeyFactory.createStorageKey(
        Capabilities.tiedToArc, ramdiskKey, arcId);
    assert.instanceOf(newVolatileKey, VolatileStorageKey);
    assert.equal(newVolatileKey.toString(), volatileKey.toString());
  });

  it('registers ramdisk storage key in factory only once', () => {
    RamDiskStorageDriverProvider.register(new TestVolatileMemoryProvider());
    assert.throws(() => {
      RamDiskStorageDriverProvider.register(new TestVolatileMemoryProvider());
    });
  });

  it('does not create ramdisk storage key by factory, if not registered', () => {
    const arcId = ArcId.newForTest('arc');
    const baseKey = new VolatileStorageKey(arcId, 'unique');
    assert.throws(() => {
      StorageKeyFactory.createStorageKey(Capabilities.tiedToRuntime, baseKey, arcId);
    });
  });
});
