/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from './storage-key.js';
import {ArcId} from '../id.js';

export type StorageKeyOptions = Readonly<{
  arcId: ArcId;
}>;

export type StorageKeyCreator = (options: StorageKeyOptions) => StorageKey;

/**
 * StorageKeyFactory is a per-arc registry of StorageKey creators supported in
 * the current Runtime environment. A StorageKeyCreator requires an `arcId` to
 * provide a specific location inside the shared storage for the given Arc,
 * when laying arcs into a shared storage.
 */
export class StorageKeyFactory {
  private static defaultCreators = new Map<string, StorageKeyCreator>();
  private static registeredCreators = new Map<string, StorageKeyCreator>();

  private creators: Map<string, StorageKeyCreator>;

  constructor(public readonly options: StorageKeyOptions,
              creators?: Map<string, StorageKeyCreator>) {
    if (creators) {
      this.creators = new Map(creators);
    } else {
      this.creators = StorageKeyFactory.getDefaultCreators();
      for (const [protocol, create] of Object.entries(StorageKeyFactory.registeredCreators)) {
        this.creators.set(protocol, create);
      }
    }
  }

  static getDefaultCreators(): Map<string, StorageKeyCreator> {
    return new Map(StorageKeyFactory.defaultCreators);
  }

  static registerDefaultKeyCreator(protocol: string, create: StorageKeyCreator): void {
    StorageKeyFactory.defaultCreators.set(protocol, create);
  }

  static registerKeyCreator(protocol: string, create: StorageKeyCreator): void {
    if (StorageKeyFactory.registeredCreators.get(protocol)) {
      throw new Error(`Key creator for protocol ${protocol} already registered.`);
    }
    StorageKeyFactory.registeredCreators.set(protocol, create);
  }

  static reset() {
    StorageKeyFactory.registeredCreators = new Map<string, StorageKeyCreator>();
  }

  createStorageKey(protocol: string): StorageKey {
    if (this.creators.has(protocol)) {
      return this.creators.get(protocol)(this.options);
    }
    throw new Error(`No key creator was found for protocol ${protocol}`);
  }
}
