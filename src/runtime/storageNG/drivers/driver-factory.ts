/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from '../storage-key.js';
import {StorageKeyParser} from '../storage-key-parser.js';
import {Exists, Driver} from './driver.js';
import {StorageKeyFactory} from '../storage-key-factory.js';

export interface StorageDriverProvider {
  // information on the StorageDriver and characteristics
  // of the Storage
  willSupport(storageKey: StorageKey): boolean;
  driver<Data>(storageKey: StorageKey, exists: Exists): Promise<Driver<Data>>;
}

export class DriverFactory {
  static clearRegistrationsForTesting() {
    this.providers = new Set();
    StorageKeyParser.reset();
    StorageKeyFactory.reset();
  }
  static providers: Set<StorageDriverProvider> = new Set();
  static async driverInstance<Data>(storageKey: StorageKey, exists: Exists) {
    for (const provider of this.providers) {
      if (provider.willSupport(storageKey)) {
        return provider.driver<Data>(storageKey, exists);
      }
    }
    return null;
  }

  static register(storageDriverProvider: StorageDriverProvider) {
    this.providers.add(storageDriverProvider);
  }

  static unregister(storageDriverProvider: StorageDriverProvider) {
    this.providers.delete(storageDriverProvider);
  }

  static willSupport(storageKey: StorageKey) {
    for (const provider of this.providers) {
      if (provider.willSupport(storageKey)) {
        return true;
      }
    }
    return false;
  }
}
