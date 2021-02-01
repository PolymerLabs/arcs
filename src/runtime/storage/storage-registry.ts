/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKeyFactory} from '../storage-key-factory.js';
import {DriverFactory} from './drivers/driver-factory.js';
import {StorageKeyParser} from './storage-key-parser.js';
import {VolatileMemoryProvider} from './drivers/volatile.js';

export interface StorageRegistry {
  registerStorageKeyFactory: (factory: StorageKeyFactory) => void;
  driverFactory: DriverFactory;
  storageKeyParser: StorageKeyParser;
  memoryProvider: VolatileMemoryProvider;
}
