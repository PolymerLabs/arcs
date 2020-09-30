/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {CRDTModel, CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {Exists} from './drivers/driver.js';
import {StorageKey} from './storage-key.js';
import {StoreInterface, StorageMode, ActiveStore, ProxyMessageType, ProxyMessage, ProxyCallback, StorageCommunicationEndpoint, StorageCommunicationEndpointProvider, StoreConstructor} from './store-interface.js';
import {CRDTTypeRecordToType, SingletonInterfaceStore, SingletonEntityStore, CollectionEntityStore, SingletonReferenceStore, CollectionReferenceStore, MuxEntityStore} from './storage.js';
import {StoreInfo} from './store-info.js';
import {CollectionType, EntityType, SingletonType, InterfaceType, ReferenceType, MuxType, Type} from '../../types/lib-types.js';

export {
  ActiveStore,
  ProxyCallback,
  ProxyMessage,
  ProxyMessageType,
  StorageCommunicationEndpoint,
  StorageCommunicationEndpointProvider,
  StorageMode
};

export function isSingletonInterfaceStore(store: StoreInfo<Type>): store is StoreInfo<SingletonType<InterfaceType>> {
  return (store.type.isSingleton && store.type.getContainedType().isInterface);
}

export function isSingletonEntityStore(store: StoreInfo<Type>): store is StoreInfo<SingletonType<EntityType>> {
  return (store.type.isSingleton && store.type.getContainedType().isEntity);
}

export function isCollectionEntityStore(store: StoreInfo<Type>): store is StoreInfo<CollectionType<EntityType>> {
  return (store.type.isCollection && store.type.getContainedType().isEntity);
}

export function isSingletonReferenceStore(store: StoreInfo<Type>): store is StoreInfo<SingletonType<ReferenceType<EntityType>>> {
  return (store.type.isSingleton && store.type.getContainedType().isReference);
}

export function isCollectionReferenceStore(store: StoreInfo<Type>): store is StoreInfo<CollectionType<ReferenceType<EntityType>>> {
  return (store.type.isCollection && store.type.getContainedType().isReference);
}

export function isMuxEntityStore(store: StoreInfo<Type>): store is StoreInfo<MuxType<EntityType>> {
  return (store.type.isMuxType());
}

export function entityHasName(name: string) {
  return <T extends Type>(store: StoreInfo<T>) =>
    store.type.getContainedType().isEntity && store.type.getContainedType().getEntitySchema().names.includes(name);
}

// A representation of a store. Note that initially a constructed store will be
// inactive - it will not connect to a driver, will not accept connections from
// StorageProxy objects, and no data will be read or written.
//
// Calling 'activate()' will generate an interactive store and return it.
export class Store<T extends CRDTTypeRecord> implements StoreInterface<T> {
  private activeStore: ActiveStore<T> | null;

  // This map creates a cyclic dependency, so it is inject from store-constructors
  // instead of being defined here.
  static constructors : Map<StorageMode, StoreConstructor> = null;

  constructor(public readonly storeInfo: StoreInfo<CRDTTypeRecordToType<T>>) {}

  get type() { return this.storeInfo.type; }
  get id() { return this.storeInfo.id; }
  get apiChannelMappingId() { return this.storeInfo.apiChannelMappingId; }
  get name() { return this.storeInfo.name; }
  get source() { return this.storeInfo.source; }
  get description() { return this.storeInfo.description; }
  get claims() { return this.storeInfo.claims; }

  get storageKey(): StorageKey { return this.storeInfo.storageKey; }
  get versionToken(): string { return this.storeInfo.versionToken; }
  get mode(): StorageMode { return this.storeInfo.mode; }
  get exists(): Exists { return this.storeInfo.exists; }
  set exists(exists: Exists)  { this.storeInfo.exists = exists; }

  async activate(): Promise<ActiveStore<T>> {
    if (this.activeStore) {
      return this.activeStore;
    }

    if (Store.constructors.get(this.mode) == null) {
      throw new Error(`StorageMode ${this.mode} not yet implemented`);
    }
    const constructor = Store.constructors.get(this.mode);
    if (constructor == null) {
      throw new Error(`No constructor registered for mode ${this.mode}`);
    }
    this.activeStore = await constructor.construct<T>({
      storageKey: this.storageKey,
      exists: this.exists,
      type: this.type,
      storeInfo: this.storeInfo,
    }) as ActiveStore<T>;
    this.exists = Exists.ShouldExist;
    return this.activeStore;
  }
}
