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

import {ArcId} from './id.js';
import {Capabilities} from './capabilities.js';
import {Flags} from './flags.js';
import {StorageKey} from './storageNG/storage-key.js';
import {DriverFactory} from './storageNG/drivers/driver-factory.js';
import {Schema} from './schema.js';
import {Type} from './type.js';
import {ReferenceModeStorageKey} from './storageNG/reference-mode-storage-key.js';

export type CapabilitiesResolverOptions = Readonly<{
  arcId: ArcId;
}>;

export abstract class StorageKeyOptions {
  constructor(
      public readonly arcId: ArcId,
      public readonly schemaHash: string,
      protected readonly schemaName: string = null) {}
  abstract location(): string;
  abstract unique(): string;
}

class ContainerStorageKeyOptions extends StorageKeyOptions {
  constructor(arcId: ArcId, schemaHash: string, schemaName?: string) {
    super(arcId, schemaHash, schemaName);
  }

  unique(): string { return ''; }
  location(): string { return this.arcId.toString(); }
}

class BackingStorageKeyOptions extends StorageKeyOptions {
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

export type StorageKeyCreator = (options: StorageKeyOptions) => StorageKey;
export type StorageKeyCreatorInfo =
    {protocol: string, capabilities: Capabilities, create: StorageKeyCreator};

// TODO(mmandlis): update to always return a ReferenceModeStorageKey.
export class CapabilitiesResolver {
  private static defaultCreators: Set<StorageKeyCreatorInfo> = new Set();
  private static registeredCreators: Set<StorageKeyCreatorInfo> = new Set();

  private creators: StorageKeyCreatorInfo[];

  constructor(public readonly options: CapabilitiesResolverOptions,
              creators?: StorageKeyCreatorInfo[]) {
    if (creators) {
      this.creators = [...creators];
    } else {
      this.creators = CapabilitiesResolver.getDefaultCreators();
      for (const {protocol, capabilities, create} of CapabilitiesResolver.registeredCreators) {
        this.creators.push({protocol, capabilities, create});
      }
    }
  }

  static getDefaultCreators(): StorageKeyCreatorInfo[] {
    return [...CapabilitiesResolver.defaultCreators];
  }

  static registerDefaultKeyCreator(
      protocol: string,
      capabilities: Capabilities,
      create: StorageKeyCreator): void {
        CapabilitiesResolver.defaultCreators.add({protocol, capabilities, create});
  }

  static registerKeyCreator(
      protocol: string,
      capabilities: Capabilities,
      create: StorageKeyCreator): void {
    CapabilitiesResolver.registeredCreators.add({protocol, capabilities, create});
  }

  static reset() {
    CapabilitiesResolver.registeredCreators = new Set();
  }

  async createStorageKey(
      capabilities: Capabilities,
      type: Type,
      handleId: string): Promise<StorageKey> {
    // TODO: This is a naive and basic solution for picking the appropriate
    // storage key creator for the given capabilities. As more capabilities are
    // added the heuristics is to become more robust.
    const protocols = this.findStorageKeyProtocols(capabilities);
    if (protocols.size === 0) {
      throw new Error(`Cannot create a suitable storage key for handle '${handleId}' with capabilities ${capabilities.toString()}`);
    } else if (protocols.size > 1) {
      console.warn(`Multiple storage key creators for handle '${handleId}' with capabilities ${capabilities.toString()}`);
    }
    const creator = this.creators.find(({protocol}) => protocol === [...protocols][0]);
    const schemaHash = await type.getEntitySchema().hash();
    const containerKey = creator.create(new ContainerStorageKeyOptions(
        this.options.arcId, schemaHash, type.getEntitySchema().name));
    const containerChildKey = containerKey.childKeyForHandle(handleId);
    if (!Flags.defaultReferenceMode) {
      return containerChildKey;
    }
    if (type.isReference ||
        (type.getContainedType() && type.getContainedType().isReference)) {
      return containerChildKey;
    }
    const backingKey = creator.create(new BackingStorageKeyOptions(
        this.options.arcId, schemaHash, type.getEntitySchema().name));
    return new ReferenceModeStorageKey(backingKey, containerChildKey);
  }

  findStorageKeyProtocols(inCapabilities: Capabilities): Set<string> {
    const protocols: Set<string> = new Set();
    for (const {protocol, capabilities} of this.creators) {
      if (capabilities.contains(inCapabilities)) {
          protocols.add(protocol);
      }
    }
    return protocols;
  }
}
