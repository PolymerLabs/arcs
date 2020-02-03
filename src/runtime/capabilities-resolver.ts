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
import {StorageKeyFactory, StorageKeyCreator} from './storageNG/storage-key-factory.js';

export class CapabilitiesResolver {
  static createStorageKey(capabilities: Capabilities, factory: StorageKeyFactory): StorageKey {
    // TODO: This is a naive and basic solution for picking the appropriate
    // storage key creator for the given capabilities. As more capabilities are
    // added the heuristics is to become more robust.
    const protocols = factory.findStorageKeyProtocols(capabilities);

    if (protocols.size === 0) {
      throw new Error(`Cannot create a suitable storage key for ${capabilities.toString()}`);
    } else if (protocols.size > 1) {
      console.warn(`Multiple storage key creators for ${capabilities.toString()}`);
    }

    return factory.createStorageKey([...protocols][0]);
  }
}
