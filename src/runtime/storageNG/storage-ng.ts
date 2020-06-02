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
import {Type, CollectionType, EntityType, ReferenceType, SingletonType, InterfaceType, MuxType, CountType} from '../type.js';
import {Ttl} from '../recipe/ttl.js';
import {SingletonHandle, CollectionHandle, Handle} from './handle.js';
import {Particle} from '../particle.js';
import {CRDTSingletonTypeRecord} from '../crdt/crdt-singleton.js';
import {ActiveStore, Store, StoreMuxer} from './store.js';
import {Entity, SerializedEntity} from '../entity.js';
import {Id, IdGenerator} from '../id.js';
import {ParticleSpec, StorableSerializedParticleSpec} from '../particle-spec.js';
import {CRDTCollectionTypeRecord} from '../crdt/crdt-collection.js';
import {SerializedReference, Reference} from '../reference.js';
import {StoreInfo, AbstractStore, isMuxEntityStore} from './abstract-store.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';
import {CRDTEntityTypeRecord, Identified} from '../crdt/crdt-entity.js';
import {ActiveMuxer, AbstractActiveStore, isActiveMuxer, isActiveStore} from './store-interface.js';
import {EntityHandleFactory} from './entity-handle-factory.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';

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

export type MuxEntityType = MuxType<EntityType>;
export type CRDTMuxEntity = CRDTEntityTypeRecord<Identified, Identified>;
export type MuxEntityStore = StoreMuxer<CRDTMuxEntity>;
export type ActiveMuxEntityStore = ActiveMuxer<CRDTMuxEntity>;
export type MuxEntityHandle = EntityHandleFactory<CRDTMuxEntity>;

export type ToStore<T extends Type>
  = T extends CollectionEntityType ? CollectionEntityStore :
   (T extends CollectionReferenceType ? CollectionReferenceStore :
   (T extends SingletonEntityType ? SingletonEntityStore :
   (T extends SingletonReferenceType ? SingletonReferenceStore :
   (T extends SingletonInterfaceType ? SingletonInterfaceStore :
   (T extends MuxEntityType ? MuxEntityStore :
    AbstractStore)))));

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

export type TypeToCRDTTypeRecord<T extends Type>
  = T extends SingletonEntityType ? CRDTEntitySingleton :
  (T extends CollectionEntityType ? CRDTEntityCollection :
  (T extends SingletonReferenceType ? CRDTReferenceSingleton :
  (T extends CollectionReferenceType ? CRDTReferenceCollection :
  (T extends SingletonInterfaceType ? CRDTInterfaceSingleton :
  (T extends MuxEntityType ? CRDTMuxEntity :
  CRDTTypeRecord)))));

export type CRDTTypeRecordToType<T extends CRDTTypeRecord>
  = T extends CRDTEntitySingleton ? SingletonEntityType :
  (T extends CRDTEntityCollection ? CollectionEntityType :
  (T extends CRDTReferenceSingleton ? SingletonReferenceType :
  (T extends CRDTReferenceCollection ? CollectionReferenceType :
  (T extends CRDTInterfaceSingleton ? SingletonInterfaceType :
  // tslint:disable-next-line: no-any
  (T extends CRDTEntityTypeRecord<any, any> ? MuxEntityType :
  Type)))));

export type ToHandle<T extends CRDTTypeRecord>
  = T extends CRDTEntityCollection ? CollectionEntityHandle :
  (T extends CRDTReferenceCollection ? CollectionReferenceHandle :
  (T extends CRDTEntitySingleton ? SingletonEntityHandle :
  (T extends CRDTReferenceSingleton ? SingletonReferenceHandle :
  (T extends CRDTInterfaceSingleton ? SingletonInterfaceHandle :
  (T extends CRDTMuxEntity ? MuxEntityHandle :
   Handle<T>|EntityHandleFactory<CRDTMuxEntity>)))));

export function newStore<T extends Type>(type: T, opts: StoreInfo & {storageKey: StorageKey, exists: Exists}): ToStore<T> {
  if (type.isMuxType()) {
    return new StoreMuxer(type, opts) as ToStore<T>;
  }
  return new Store(type, opts) as ToStore<T>;
}

export function storeType<T extends Store<CRDTTypeRecord>>(store: T) {
  return store.type as ToType<T>;
}

export function handleType<T extends Handle<CRDTTypeRecord>>(handle: T) {
  return handle.type as HandleToType<T>;
}

export async function newHandle<T extends Type>(type: T, storageKey: StorageKey, arc: ArcLike, options: StoreInfo & HandleOptions): Promise<ToHandle<TypeToCRDTTypeRecord<T>>> {
  options['storageKey'] = storageKey;
  options['exists'] = Exists.MayExist;
  const store = newStore(type, options as StoreInfo & {storageKey: StorageKey, exists: Exists});
  if (isMuxEntityStore(store)) {
    return await handleForMuxer(store, arc, options) as ToHandle<TypeToCRDTTypeRecord<T>>;
  }
  return handleForStore(store as unknown as Store<TypeToCRDTTypeRecord<T>>, arc, options);
}

export function handleForActiveStore<T extends CRDTTypeRecord>(
  store: AbstractActiveStore<T>,
  arc: ArcLike,
  options: HandleOptions = {}
): ToHandle<T> {
  const type = options.type || store.baseStore.type;
  const storageKey = store.baseStore.storageKey.toString();

  const idGenerator = arc.idGenerator;
  const particle = options.particle || null;
  const canRead = (options.canRead != undefined) ? options.canRead : true;
  const canWrite = (options.canWrite != undefined) ? options.canWrite : true;
  const name = options.name || null;
  const generateID = arc.generateID ? () => arc.generateID().toString() : () => '';
  if (isActiveMuxer(store)) {
    const proxyMuxer = new StorageProxyMuxer<CRDTMuxEntity>(store, type, storageKey);
    return new EntityHandleFactory(proxyMuxer) as ToHandle<T>;
  } else if (isActiveStore(store)) {
    const proxy = new StorageProxy<T>(store.baseStore.id, store, type, storageKey, options.ttl);
    if (type instanceof SingletonType) {
      // tslint:disable-next-line: no-any
      return new SingletonHandle(generateID(), proxy as any, idGenerator, particle, canRead, canWrite, name) as ToHandle<T>;
    } else {
      // tslint:disable-next-line: no-any
      return new CollectionHandle(generateID(), proxy as any, idGenerator, particle, canRead, canWrite, name) as ToHandle<T>;
    }
  } else {
    throw Error('Invalid active store');
  }
}

export async function handleForStore<T extends CRDTTypeRecord>(store: Store<T>, arc: ArcLike, options?: HandleOptions): Promise<ToHandle<T>> {
  return handleForActiveStore(await store.activate(), arc, options) as ToHandle<T>;
}

export async function handleForMuxer<T extends CRDTMuxEntity>(store: StoreMuxer<T>, arc: ArcLike, options?: HandleOptions): Promise<ToHandle<T>> {
  return handleForActiveStore(await store.activate(), arc, options) as ToHandle<T>;
}
