/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProxy} from './storage-proxy.js';
import {Type, CollectionType, EntityType, ReferenceType, SingletonType, InterfaceType} from '../type.js';
import {Ttl} from '../recipe/ttl.js';
import {SingletonHandle, CollectionHandle, Handle} from './handle.js';
import {Particle} from '../particle.js';
import {CRDTSingletonTypeRecord} from '../crdt/crdt-singleton.js';
import {ActiveStore, Store} from './store.js';
import {Entity, SerializedEntity} from '../entity.js';
import {Id, IdGenerator} from '../id.js';
import {ParticleSpec, StorableSerializedParticleSpec} from '../particle-spec.js';
import {CRDTCollectionTypeRecord} from '../crdt/crdt-collection.js';
import {SerializedReference, Reference} from '../reference.js';
import {StoreInfo} from './abstract-store.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';

type HandleOptions = {
  type?: Type;
  ttl?: Ttl;
  particle?: Particle;
  canRead?: boolean;
  canWrite?: boolean;
  name?: string;
};

type ArcLike = {
  generateID: () => Id;
  idGenerator: IdGenerator;
};

export type SingletonEntityType = SingletonType<EntityType>;
export type CRDTEntitySingleton = CRDTSingletonTypeRecord<SerializedEntity>;
export type SingletonEntityStore = Store<CRDTEntitySingleton>;
export type ActiveSingletonEntityStore = ActiveStore<CRDTEntitySingleton>;
export type SingletonEntityHandle = SingletonHandle<Entity>;

export type CollectionEntityType = CollectionType<EntityType>;
export type CRDTEntityCollection = CRDTCollectionTypeRecord<SerializedEntity>;
export type CollectionEntityStore = Store<CRDTEntityCollection>;
export type ActiveCollectionEntityStore = ActiveStore<CRDTEntityCollection>;
export type CollectionEntityHandle = CollectionHandle<Entity>;

export type SingletonReferenceType = SingletonType<ReferenceType<EntityType>>;
export type CRDTReferenceSingleton = CRDTSingletonTypeRecord<SerializedReference>;
export type SingletonReferenceStore = Store<CRDTReferenceSingleton>;
export type ActiveSingletonReferenceStore = ActiveStore<CRDTReferenceSingleton>;
export type SingletonReferenceHandle = SingletonHandle<Reference>;

export type CollectionReferenceType = CollectionType<ReferenceType<EntityType>>;
export type CRDTReferenceCollection = CRDTCollectionTypeRecord<SerializedReference>;
export type CollectionReferenceStore = Store<CRDTReferenceCollection>;
export type ActiveCollectionReferenceStore = ActiveStore<CRDTReferenceCollection>;
export type CollectionReferenceHandle = CollectionHandle<Reference>;

export type SingletonInterfaceType = SingletonType<InterfaceType>;
export type CRDTInterfaceSingleton = CRDTSingletonTypeRecord<StorableSerializedParticleSpec>;
export type SingletonInterfaceStore = Store<CRDTInterfaceSingleton>;
export type ActiveSingletonInterfaceStore = ActiveStore<CRDTInterfaceSingleton>;
export type SingletonInterfaceHandle = SingletonHandle<ParticleSpec>;


export type ToStore<T extends Type>
  = T extends CollectionEntityType ? CollectionEntityStore :
   (T extends CollectionReferenceType ? CollectionReferenceStore :
   (T extends SingletonEntityType ? SingletonEntityStore :
   (T extends SingletonReferenceType ? SingletonReferenceStore :
   (T extends SingletonInterfaceType ? SingletonInterfaceStore :
    Store<CRDTTypeRecord>))));

export type ToActive<T extends Store<CRDTTypeRecord>>
  = T extends CollectionEntityStore ? ActiveCollectionEntityStore :
   (T extends CollectionReferenceStore ? ActiveCollectionReferenceStore :
   (T extends SingletonEntityStore ? ActiveSingletonEntityStore :
   (T extends SingletonReferenceStore ? ActiveSingletonReferenceStore :
   (T extends SingletonInterfaceStore ? ActiveSingletonInterfaceStore :
    ActiveStore<CRDTTypeRecord>))));

export type ToType<T extends Store<CRDTTypeRecord>>
  = T extends CollectionEntityStore ? CollectionEntityType :
   (T extends CollectionReferenceStore ? CollectionReferenceType :
   (T extends SingletonEntityStore ? SingletonEntityType :
   (T extends SingletonReferenceStore ? SingletonReferenceType :
   (T extends SingletonInterfaceStore ? SingletonInterfaceType :
    Type))));

export type HandleToType<T extends Handle<CRDTTypeRecord>>
  = T extends CollectionEntityHandle ? CollectionEntityType :
  (T extends CollectionReferenceHandle ? CollectionReferenceType :
  (T extends SingletonEntityHandle ? SingletonEntityType :
  (T extends SingletonReferenceHandle ? SingletonReferenceType :
  (T extends SingletonInterfaceHandle ? SingletonInterfaceType :
   Type))));

export type ToHandle<T extends ActiveStore<CRDTTypeRecord>>
  = T extends ActiveCollectionEntityStore ? CollectionEntityHandle :
   (T extends ActiveCollectionReferenceStore ? CollectionReferenceHandle :
   (T extends ActiveSingletonEntityStore ? SingletonEntityHandle :
   (T extends ActiveSingletonReferenceStore ? SingletonReferenceHandle :
   (T extends ActiveSingletonInterfaceStore ? SingletonInterfaceHandle :
    never))));

export function newStore<T extends Type>(type: T, opts: StoreInfo & {storageKey: StorageKey, exists: Exists}): ToStore<T> {
  return new Store(type, opts) as ToStore<T>;
}

export function storeType<T extends Store<CRDTTypeRecord>>(store: T) {
  return store.type as ToType<T>;
}

export function handleType<T extends Handle<CRDTTypeRecord>>(handle: T) {
  return handle.type as HandleToType<T>;
}

export async function newHandle<T extends Type>(type: T, storageKey: StorageKey, arc: ArcLike, options: StoreInfo & HandleOptions): Promise<ToHandle<ToActive<ToStore<T>>>> {
  options['storageKey'] = storageKey;
  options['exists'] = Exists.MayExist;
  const store = newStore(type, options as StoreInfo & {storageKey: StorageKey, exists: Exists});
  return handleForStore(store, arc, options);
}

export function handleForActiveStore<T extends CRDTTypeRecord>(
  store: ActiveStore<T>,
  arc: ArcLike,
  options?: HandleOptions
): ToHandle<ActiveStore<T>> {
  const type = options && options.type ? options.type : store.baseStore.type;
  const storageKey = store.baseStore.storageKey.toString();
  const ttl = options && options.ttl ? options.ttl : undefined;
  const proxy = new StorageProxy<T>(store.baseStore.id, store, type, storageKey, ttl);
  const idGenerator = arc.idGenerator;
  const particle = options && options.particle ? options.particle : null;
  const canRead = options && options.canRead ? options.canRead : true;
  const canWrite = options && options.canWrite ? options.canWrite : true;
  const name = options && options.name ? options.name : null;
  const generateID = arc.generateID ? () => arc.generateID().toString() : () => '';
  if (type instanceof SingletonType) {
    // tslint:disable-next-line: no-any
    return new SingletonHandle(generateID(), proxy as any, idGenerator, particle, canRead, canWrite, name) as ToHandle<ActiveStore<T>>;
  } else {
    // tslint:disable-next-line: no-any
    return new CollectionHandle(generateID(), proxy as any, idGenerator, particle, canRead, canWrite, name) as ToHandle<ActiveStore<T>>;
  }
}

export async function handleForStore<T extends CRDTTypeRecord>(store: Store<T>, arc: ArcLike, options?: HandleOptions): Promise<ToHandle<ActiveStore<T>>> {
  return handleForActiveStore(await store.activate(), arc, options);
}
