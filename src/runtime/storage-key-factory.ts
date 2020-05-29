/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
// import {StorageKeyOptions} from './capabilities-resolver.js';
import {StorageKey} from './storageNG/storage-key.js';
import {Capabilities} from './capabilities-new.js';
import {ArcId} from './id.js';

export abstract class StorageKeyOptions {
  constructor(
      public readonly arcId: ArcId,
      public readonly schemaHash: string,
      protected readonly schemaName: string = null) {}
  abstract location(): string;
  abstract unique(): string;
}

export class ContainerStorageKeyOptions extends StorageKeyOptions {
  constructor(arcId: ArcId, schemaHash: string, schemaName?: string) {
    super(arcId, schemaHash, schemaName);
  }

  unique(): string { return ''; }
  location(): string { return this.arcId.toString(); }
}

export class BackingStorageKeyOptions extends StorageKeyOptions {
  constructor(arcId: ArcId, schemaHash: string, schemaName?: string) {
    super(arcId, schemaHash, schemaName);
  }
  unique(): string {
    return this.schemaName && this.schemaName.length > 0
        ? this.schemaName : this.schemaHash;
  }
  location(): string {
    return this.unique();
  }
}

export abstract class StorageKeyFactory {
  abstract get protocol();

  abstract create(options: StorageKeyOptions): StorageKey;

  // Returns the lower bound set of Capabilities that can be supported.
  // Each storage key subclass may override this method with appropriate capabilities.
  minCapabilities(): Capabilities {
    return Capabilities.none();
  }
  // Returns the upper bound set of Capabilities that can be supported.
  // Each storage key subclass may override this method with appropriate capabilities.
  maxCapabilities(): Capabilities {
    return this.minCapabilities();
  }

  // Returns true, if the current storage key class can support the given set
  // of Capabilities.
  supports(capabilities: Capabilities): boolean {
    return this.minCapabilities().isSameOrLessStrict(capabilities)
        && this.maxCapabilities().isSameOrStricter(capabilities);
  }
}

// An interface for selecting a factory, if more than one are available for the
// Capabilities.
export interface FactorySelector {
  select(factories: StorageKeyFactory[]): StorageKeyFactory;
}

// An implementation of a FactorySelector choosing a factory with a least
// restrictive max capabilities set.
export class LeastRestrictiveCapabilitiesSelector implements FactorySelector {
  select(factories: StorageKeyFactory[]): StorageKeyFactory {
    assert(factories.length > 0);
    return factories.reduce((res, factory) => {
      return res !== null &&
          res.maxCapabilities().isSameOrLessStrict(factory.maxCapabilities())
              ? res : factory;
    }, null);
  }
}
