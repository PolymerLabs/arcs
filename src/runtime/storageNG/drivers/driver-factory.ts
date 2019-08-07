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

export enum Exists {ShouldExist, ShouldCreate, MayExist}

export type ReceiveMethod<T> = (model: T, version: number) => void;

export interface StorageDriverProvider {
  // information on the StorageDriver and characteristics
  // of the Storage
  willSupport(storageKey: StorageKey): boolean;
  driver<Data>(storageKey: StorageKey, exists: Exists): Promise<Driver<Data>>;
}

// Interface that drivers must support.
// 
// Note the threading of a version number here; each model provided
// by the driver to the Store (using the receiver) is paired with a version,
// as is each model sent from the Store to the driver (using Driver.send()).
// 
// This threading is used to track whether driver state has changed while
// the Store is processing a particular model. send() should always fail
// if the version isn't exactly 1 greater than the current internal version.
export abstract class Driver<Data> {
  storageKey: StorageKey;
  exists: Exists;
  constructor(storageKey: StorageKey, exists: Exists) {
    this.storageKey = storageKey;
    this.exists = exists;
  }
  abstract registerReceiver(receiver: ReceiveMethod<Data>): void;
  abstract async send(model: Data, version: number): Promise<boolean>;

  // these methods only available to Backing Stores and will
  // be removed once entity mutation is performed on CRDTs
  // tslint:disable-next-line: no-any
  abstract async write(key: StorageKey, value: any): Promise<void>;
  // tslint:disable-next-line: no-any  
  abstract async read(key: StorageKey): Promise<any>;
}

export class DriverFactory {
  static clearRegistrationsForTesting() {
    this.providers = new Set();
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
