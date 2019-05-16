import {Driver, ReceiveMethod, StorageDriverProvider, Exists, DriverFactory} from "./driver-factory";
import {StorageKey} from "../storage-key";

/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

class VolatileMemory {
  
}

export class VolatileDriver<Data> extends Driver<Data> {

  constructor(storageKey: StorageKey, exists: Exists) {
    super(storageKey, exists);
  }

  registerReceiver(receiver: ReceiveMethod<Data>) {
    throw new Error("Method not implemented.");
  }
  
  async send(model: Data): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  
  async write(key: StorageKey, value: Data): Promise<void> {
    throw new Error("Method not implemented.");
  }
  
  async read(key: StorageKey): Promise<Data> {
    throw new Error("Method not implemented.");
  }
}

class VolatileStorageDriverProvider implements StorageDriverProvider {
  
  willSupport(storageKey: StorageKey): boolean {
    return storageKey.protocol === 'volatile';
  }
  
  driver<Data>(storageKey: StorageKey, exists: Exists): Driver<Data> {
    if (!this.willSupport(storageKey)) {
      throw new Error(`This provider does not support storageKey ${storageKey.toString()}`);
    }

    return new VolatileDriver<Data>(storageKey, exists);
  }
}

DriverFactory.register(new VolatileStorageDriverProvider());
