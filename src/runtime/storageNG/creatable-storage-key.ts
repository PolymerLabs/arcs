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
import {Capabilities, Capability} from '../capabilities.js';

/**
 * Represents a store that will be created once the recipe is instantiated.
 * Capabilities from the storage key will inform what storage driver should be used.
 */
export class CreatableStorageKey extends StorageKey {
  public static readonly protocol = 'create';

  constructor(readonly name: string, readonly capabilities = Capabilities.empty) {
    super(CreatableStorageKey.protocol);
  }

  toString() {
    const separator = this.capabilities.isEmpty() ? '' : '?';
    const capabilities = [...this.capabilities.capabilities]
        // This is sad: expectation of casing of
        // serialized capability names differ across the system.
        .map(c => c[0].toUpperCase() + c.substring(1))
        .join(',');
    return `${CreatableStorageKey.protocol}://${this.name}${separator}${capabilities}`;
  }

  childWithComponent(_: string): StorageKey {
    throw new Error('childWithComponent is not available for CreatableStorageKeys');
  }

  subKeyWithComponent(_: string): StorageKey {
    throw new Error('subKeyWithComponent is not available for CreatableStorageKeys');
  }

  static fromString(key: string): CreatableStorageKey {
    const match = key.match(/^create:\/\/([^?]+)(?:\?([a-zA-Z,]*))?$/);
    if (!match) {
      throw new Error(`Not a valid CreatableStorageKey: ${key}.`);
    }
    const [_, name, capabilitiesString] = match;

    if (capabilitiesString === undefined || capabilitiesString === '') {
      return new CreatableStorageKey(name, Capabilities.empty);
    }

    const capabilities = new Capabilities(capabilitiesString.split(',').map(name => {
      const capability = Capability[name] as Capability;
      if (!capability) throw new Error(`Capability not recognized: ${name}.`);
      return capability;
    }));

    return new CreatableStorageKey(name, capabilities);
  }
}
