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
import {Exists, Driver} from './driver.js';

export interface StorageDriverProvider {
  // information on the StorageDriver and characteristics of the Storage.
  willSupport(storageKey: StorageKey): boolean;
  driver<Data>(storageKey: StorageKey, exists: Exists): Promise<Driver<Data>>;
}

let staticDriverFactory;

export class DriverFactory {
  providers: Set<StorageDriverProvider> = new Set();
  constructor() {
    staticDriverFactory = this;
  }
  register(storageDriverProvider: StorageDriverProvider) {
    this.providers.add(storageDriverProvider);
  }
  unregister(storageDriverProvider: StorageDriverProvider) {
    this.providers.delete(storageDriverProvider);
  }
  willSupport(storageKey: StorageKey) {
    return !!(this.supportingProvider(storageKey));
  }
  async driverInstance<Data>(storageKey: StorageKey, exists: Exists) {
    const provider = this.supportingProvider(storageKey);
    return provider ? provider.driver<Data>(storageKey, exists) : null;
  }
  supportingProvider(storageKey): StorageDriverProvider {
    for (const provider of this.providers) {
      if (provider.willSupport(storageKey)) {
        return provider;
      }
    }
    return null;
  }
  // statics
  static async driverInstance<Data>(storageKey: StorageKey, exists: Exists) {
    return staticDriverFactory.driverInstance(storageKey, exists);
  }
}
