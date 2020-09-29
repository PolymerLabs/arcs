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
import {CRDTTypeRecordToType} from './storage.js';
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
