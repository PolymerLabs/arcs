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
import {StorageKeyCreator, CapabilitiesResolverOptions} from './capabilities-resolver.js';
import {Dictionary} from './hot.js';
import {StorageKey} from './storageNG/storage-key.js';
import {Type} from './type.js';
import {Capabilities} from './capabilities-new.js';
import {ReferenceModeStorageKey} from './storageNG/reference-mode-storage-key.js';
import {Flags} from './flags.js';
import {StorageKeyFactory, FactorySelector, ContainerStorageKeyOptions, BackingStorageKeyOptions, LeastRestrictiveCapabilitiesSelector} from './storage-key-factory.js';

export class CapabilitiesResolver {
  private static storageKeyFactories: Dictionary<StorageKeyFactory> = {};
  private static defaultSelector = new LeastRestrictiveCapabilitiesSelector();

  constructor(public readonly options: CapabilitiesResolverOptions & {
    factories?: StorageKeyFactory[], selector? : FactorySelector}) {
    for (const factory of (options.factories || [])) {
      assert(!CapabilitiesResolver.storageKeyFactories[factory.protocol],
          `Storage key creator for '${factory.protocol}' already registered.`);
    }
  }
  get factories() { return this.options.factories || []; }
  get selector() { return this.options.selector || CapabilitiesResolver.defaultSelector; }

  async createStorageKey(capabilities: Capabilities, type: Type, handleId: string): Promise<StorageKey> {
    const selectedFactories = [
      ...Object.values(CapabilitiesResolver.storageKeyFactories),
      ...this.factories].filter(factory => {
        return factory.supports(capabilities);
      }
    );
    if (selectedFactories.length === 0) {
      throw new Error(`Cannot create a suitable storage key for handle '${handleId}' with capabilities ${capabilities.toString()}`);
    }
    const factory = this.selector.select(selectedFactories);
    return this.createStorageKeyWithFactory(factory, type, handleId);
  }

  private async createStorageKeyWithFactory(factory: StorageKeyFactory, type: Type, handleId: string): Promise<StorageKey> {
    const schemaHash = await type.getEntitySchema().hash();
    const containerKey = factory.create(new ContainerStorageKeyOptions(
        this.options.arcId, schemaHash, type.getEntitySchema().name));
    const containerChildKey = containerKey.childKeyForHandle(handleId);
    if (!Flags.defaultReferenceMode) {
      return containerChildKey;
    }
    if (type.isReference ||
        (type.getContainedType() && type.getContainedType().isReference)) {
      return containerChildKey;
    }
    const backingKey = factory.create(new BackingStorageKeyOptions(
        this.options.arcId, schemaHash, type.getEntitySchema().name));
    return new ReferenceModeStorageKey(backingKey, containerChildKey);
  }

  static registerStorageKeyFactory(factory: StorageKeyFactory) {
    assert(!CapabilitiesResolver.storageKeyFactories[factory.protocol],
        `Storage key creator for '${factory.protocol}' already registered`);
    CapabilitiesResolver.storageKeyFactories[factory.protocol] = factory;
  }

  static reset() {
    CapabilitiesResolver.storageKeyFactories = {};
  }
}
