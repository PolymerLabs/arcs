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
import {TestVolatileMemoryProvider} from '../../../testing/test-volatile-memory-provider.js';

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
});
