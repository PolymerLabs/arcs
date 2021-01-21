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
import {Dictionary} from '../utils/lib-utils.js';
import {StorageKey} from './storage/storage-key.js';
import {Type} from '../types/lib-types.js';
import {ArcId} from './id.js';
import {Flags} from './flags.js';
import {Capabilities} from './capabilities.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';
import {StorageKeyFactory,
        FactorySelector,
        ContainerStorageKeyOptions,
        BackingStorageKeyOptions,
        SimpleCapabilitiesSelector} from './storage-key-factory.js';

export type CapabilitiesResolverOptions = Readonly<{
  arcId: ArcId;
}>;

export class _CapabilitiesResolver {
  private defaultStorageKeyFactories: Dictionary<StorageKeyFactory> = {};
  private readonly defaultSelector = new SimpleCapabilitiesSelector();
  private readonly factories: Dictionary<StorageKeyFactory> = {};

  constructor(public readonly options?: CapabilitiesResolverOptions & {
    factories?: StorageKeyFactory[], selector? : FactorySelector}) {
    for (const factory of (options?.factories || [])) {
      assert(!this.factories[factory.protocol], `Duplicated factory for '${factory.protocol}'.`);
      this.factories[factory.protocol] = factory;
    }
    for (const factory of Object.values(this.defaultStorageKeyFactories)) {
      if (!this.factories[factory.protocol]) {
        this.factories[factory.protocol] = factory;
      }
    }
  }

  get selector() { return (this.options && this.options.selector) || this.defaultSelector; }

  async createStorageKey(capabilities: Capabilities, type: Type, handleId: string, arcId?: ArcId): Promise<StorageKey> {
    const factory = this.selectStorageKeyFactory(capabilities, handleId);
    return this.createStorageKeyWithFactory(factory, type, handleId, arcId);
  }

  selectStorageKeyFactory(capabilities: Capabilities, handleId: string): StorageKeyFactory {
    const selectedFactories = Object.values(this.defaultStorageKeyFactories).filter(factory => {
      return factory.supports(capabilities);
    });
    selectedFactories.push(...Object.values(this.factories).filter(factory => {
      return factory.supports(capabilities);
    }));

    this.defaultStorageKeyFactories
    if (selectedFactories.length === 0) {
      throw new Error(`Cannot create a suitable storage key for handle '${
        handleId}' with capabilities ${capabilities.toDebugString()}`);
    }
    return this.selector.select(selectedFactories);
  }

  private async createStorageKeyWithFactory(factory: StorageKeyFactory, type: Type, handleId: string, arcId?: ArcId): Promise<StorageKey> {
    const schema = type.getEntitySchema();
    const schemaHash = await schema.hash();
    const options = new ContainerStorageKeyOptions(((this.options && this.options.arcId) || arcId), schemaHash, schema.name);
    const containerKey = factory.create(options);
    const containerChildKey = containerKey.childKeyForHandle(handleId);
    if (!Flags.defaultReferenceMode) {
      return containerChildKey;
    }
    const containedType = type.getContainedType();
    if (type.isReference || (containedType && containedType.isReference)) {
      return containerChildKey;
    }
    const backingKey = factory.create(new BackingStorageKeyOptions(this.options.arcId, schemaHash, schema.name));
    // ReferenceModeStorageKeys in different drivers can cause problems with garbage collection.
    assert(backingKey.protocol === containerKey.protocol);
    return new ReferenceModeStorageKey(backingKey, containerChildKey);
  }

  registerStorageKeyFactory(factory: StorageKeyFactory) {
    const defaultFactories = this.defaultStorageKeyFactories;
    assert(!defaultFactories[factory.protocol], `Storage key factory for '${factory.protocol}' already registered`);
    defaultFactories[factory.protocol] = factory;
  }

  reset() {
    this.defaultStorageKeyFactories = {};
  }
}

//export const CapabilitiesResolver = new _CapabilitiesResolver();

