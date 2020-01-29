/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';

import {Capabilities} from './capabilities.js';
import {StorageKey} from './storageNG/storage-key.js';
import {DriverFactory} from './storageNG/drivers/driver-factory.js';
import {FirebaseStorageKey} from './storageNG/drivers/firebase.js';
import {StorageKeyFactory} from './storageNG/storage-key-factory.js';
import {RamDiskStorageKey} from './storageNG/drivers/ramdisk.js';
import {VolatileStorageKey} from './storageNG/drivers/volatile.js';

export class CapabilitiesResolver {
  static createStorageKey(capabilities: Capabilities, factory: StorageKeyFactory): StorageKey {
    const protocol = null;
    let storageKey = null;
    // TODO: This is a temporary solution for picking the appropriate storage
    // key creator for the given capabilities. As more capabilities are added
    // the heuristics is to become more robust.
    if (capabilities.isTiedToArc) {
      storageKey = factory.createStorageKey(VolatileStorageKey.protocol);
      if (storageKey) return storageKey;
    }
    if (capabilities.isTiedToRuntime) {
      storageKey = factory.createStorageKey(RamDiskStorageKey.protocol);
      if (storageKey) return storageKey;
    }
    if (capabilities.isPersistent) {
      storageKey = factory.createStorageKey(FirebaseStorageKey.protocol);
      if (storageKey) return storageKey;
    }
    throw new Error(`Cannot create a suitable storage key for ${capabilities.toString()}`);
  }
}
