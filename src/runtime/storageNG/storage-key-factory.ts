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
import {Capabilities} from '../capabilities.js';

export type KeyCreator = (arcId: ArcId, unique: string, path: string) => StorageKey;

/**
 * Creates storage key according to given capabilities.
 *
 * Singleton class with static methods. If you modify the default set of storage
 * keys in a test, remember to call StorageKeyFactory.reset() in the tear-down
 * method.
 */
export class StorageKeyFactory {
  private static creators =
      new Set<{capabilities: Capabilities, create: KeyCreator, isDefault: boolean}>();

  static registerDefaultKeyCreator(
      capabilities: Capabilities, create: KeyCreator): void {
    StorageKeyFactory.registerKeyCreator(capabilities, create, true);
  }

  static registerKeyCreator(
      capabilities: Capabilities, create: KeyCreator, isDefault = false): void {
    for (const creator of StorageKeyFactory.creators) {
      if (capabilities.isSame(creator.capabilities)) {
        if (isDefault) {
          StorageKeyFactory.creators.delete(creator);
        } else {
          throw new Error(`Creator for capabilities [${capabilities.toString()}] already registered.`);
        }
      }
    }
    StorageKeyFactory.creators.add({capabilities, create, isDefault});
  }

  static reset() {
    for (const creator of StorageKeyFactory.creators) {
      if (!creator.isDefault) {
        StorageKeyFactory.creators.delete(creator);
      }
    }
  }

  static createStorageKey(
      capabilities: Capabilities, baseKey: StorageKey, arcId: ArcId): StorageKey {
    // TODO: Decide whether a persistent key can be created from a volatile arc.
    for (const creator of StorageKeyFactory.creators) {
      if (capabilities.isSame(creator.capabilities)) {
        return creator.create(arcId, baseKey.getUnique(), baseKey.getPath());
      }
    }
    throw new Error(`No storage key creators for capabilities [${capabilities.toString()}]`);
  }
}
