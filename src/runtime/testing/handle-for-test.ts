/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {VolatileStorageKey} from '../../runtime/storageNG/drivers/volatile.js';
import {StorageKey} from '../../runtime/storageNG/storage-key.js';
import {ArcId} from '../../runtime/id.js';

/**
 * Creates a storage key prefix for a store for testing purposes. Returns an
 * appropriate string or NG storage key type depending on the storage migration flag.
 */
export function storageKeyPrefixForTest(): ((arcId: ArcId) => StorageKey) {
  return arcId => new VolatileStorageKey(arcId, '');
}
export function volatileStorageKeyPrefixForTest(): (arcId: ArcId) => StorageKey {
  return storageKeyPrefixForTest();
}
export function ramDiskStorageKeyPrefixForTest(): (arcId: ArcId) => StorageKey {
  return arcId => new RamDiskStorageKey('');
}

export function storageKeyForTest(arcId: ArcId): StorageKey {
  return storageKeyPrefixForTest()(arcId);
}
