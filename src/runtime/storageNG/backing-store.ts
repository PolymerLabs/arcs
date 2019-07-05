import {CRDTTypeRecord, CRDTModel} from "../crdt/crdt";
import {ActiveStore, StorageMode} from "./store";
import {StorageKey} from "./storage-key";
import {Exists} from "./drivers/driver-factory";
import {Type} from "../type";

/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class BackingStore<T extends CRDTTypeRecord> extends ActiveStore<T> {
  on(callback: import("./store-interface").ProxyCallback<T>): number {
    throw new Error("Method not implemented.");
  }
  
  off(callback: number): void {
    throw new Error("Method not implemented.");
  }
  
  async onProxyMessage(message: import("./store-interface").ProxyMessage<T>): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  static async construct<T extends CRDTTypeRecord>(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    const me = new BackingStore<T>(storageKey, exists, type, mode, modelConstructor);

    return me;
  }
}
