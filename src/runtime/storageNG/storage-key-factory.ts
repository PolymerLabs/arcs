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

export type KeyCreator = (arcId: ArcId) => StorageKey;

export class StorageKeyFactory {
  private static defaultCreators = new Map<string, KeyCreator>();
  private static creators = StorageKeyFactory.getDefaultCreators();

  constructor(public readonly arcId: ArcId) {}

  static getDefaultCreators(): Map<string, KeyCreator> {
    return new Map(StorageKeyFactory.defaultCreators);
  }

  static registerDefaultKeyCreator(protocol: string, create: KeyCreator) {
    StorageKeyFactory.defaultCreators.set(protocol, create);
    if (!StorageKeyFactory.creators.has(protocol)) {
      StorageKeyFactory.registerKeyCreator(protocol, create);
    }
  }

  static registerKeyCreator(protocol: string, create: KeyCreator) {
    if (StorageKeyFactory.creators.get(protocol)) {
      throw new Error(`Key creator for protocol ${protocol} already registered.`);
    }
    StorageKeyFactory.creators.set(protocol, create);
  }

  static reset() {
    StorageKeyFactory.creators = StorageKeyFactory.getDefaultCreators();
  }

  createStorageKey(protocol: string): StorageKey|null {
    if (StorageKeyFactory.creators.has(protocol)) {
      return StorageKeyFactory.creators.get(protocol)(this.arcId);
    }
    return null;
  }
}
