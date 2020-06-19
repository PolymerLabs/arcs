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
import {Capabilities, Capability, Persistence, Queryable, Shareable} from '../capabilities.js';

/**
 * Represents a store that will be created once the recipe is instantiated.
 * Capabilities from the storage key will inform what storage driver should be used.
 */
export class CreatableStorageKey extends StorageKey {
  public static readonly protocol = 'create';
  readonly capabilities: Capabilities;

  constructor(readonly name: string, capabilities?: Capabilities) {
    super(CreatableStorageKey.protocol);
    this.capabilities = capabilities || Capabilities.create();
  }

  toString() {
    // TODO(b/157761106): use annotations instead of creatable keys to pass capabilities.
    const capabilities = [];
    if (this.capabilities.hasEquivalent(Persistence.onDisk())) {
      capabilities.push('Persistent');
    }
    if (this.capabilities.hasEquivalent(new Shareable(true))) {
      capabilities.push('TiedToRuntime');
    } else if (this.capabilities.hasEquivalent(Persistence.inMemory()) || this.capabilities.hasEquivalent(new Shareable(false))) {
      // if (this.capabilities.hasEquivalent(new Shareable(true))) {
      //   capabilities.push('TiedToRuntime');
      // } else {
        capabilities.push('TiedToArc');
      // }
    }
    if (this.capabilities.isQueryable() || (this.capabilities.getTtl() && !this.capabilities.getTtl().isInfinite)) {
      capabilities.push('Queryable');
    }
    const separator = capabilities.length === 0 ? '' : '?';
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
      return new CreatableStorageKey(name, Capabilities.create()); //Capabilities.empty);
    }

    // TODO(b/157761106): use annotations instead of creatable keys to pass capabilities.
    const capabilities = capabilitiesString.split(',').map(name => {
      switch (name) {
        case 'Persistent':
          return Persistence.onDisk();
        case 'Queryable':
          return new Queryable(true);
        case 'TiedToArc':
          return new Shareable(false);
        case 'TiedToRuntime':
          return new Shareable(true);
        default: throw new Error(`Capability not recognized: ${name}.`);
      }
    });

    return new CreatableStorageKey(name, Capabilities.create(capabilities));
  }
}
