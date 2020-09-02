/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {StorageKey} from './storage-key.js';

/**
 * Represents a store that will be created once the recipe is instantiated.
 */
export class CreatableStorageKey extends StorageKey {
  public static readonly protocol = 'create';

  constructor(readonly name: string) {
    super(CreatableStorageKey.protocol);
  }

  toString() {
    return `${CreatableStorageKey.protocol}://${this.name}`;
  }

  childWithComponent(_: string): StorageKey {
    throw new Error('childWithComponent is not available for CreatableStorageKeys');
  }

  subKeyWithComponent(_: string): StorageKey {
    throw new Error('subKeyWithComponent is not available for CreatableStorageKeys');
  }

  static fromString(key: string): CreatableStorageKey {
    const match = key.match(/^create:\/\/([^?]+)$/);
    if (!match) {
      throw new Error(`Not a valid CreatableStorageKey: ${key}.`);
    }
    const [_, name] = match;
    return new CreatableStorageKey(name);
  }
}
