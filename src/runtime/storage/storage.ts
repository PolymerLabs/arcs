/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Type, CollectionType, EntityType, ReferenceType, SingletonType, InterfaceType, MuxType} from '../../types/lib-types.js';
import {CRDTTypeRecord, CRDTSingletonTypeRecord, CRDTCollectionTypeRecord, CRDTEntityTypeRecord, Identified} from '../../crdt/lib-crdt.js';
import {SingletonHandle, CollectionHandle, Handle} from './handle.js';
import {ActiveStore} from './active-store.js';
import {Entity, SerializedEntity} from '../entity.js';
import {ParticleSpec, StorableSerializedParticleSpec} from '../arcs-types/particle-spec.js';
import {SerializedReference, Reference} from '../reference.js';
import {EntityHandleFactory} from './entity-handle-factory.js';

export type SingletonEntityType = SingletonType<EntityType>;
export type CRDTEntitySingleton = CRDTSingletonTypeRecord<SerializedEntity>;
export type ActiveSingletonEntityStore = ActiveStore<CRDTEntitySingleton>;
export type SingletonEntityHandle = SingletonHandle<Entity>;

export type CollectionEntityType = CollectionType<EntityType>;
export type CRDTEntityCollection = CRDTCollectionTypeRecord<SerializedEntity>;
export type ActiveCollectionEntityStore = ActiveStore<CRDTEntityCollection>;
export type CollectionEntityHandle = CollectionHandle<Entity>;

export type SingletonReferenceType = SingletonType<ReferenceType<EntityType>>;
export type CRDTReferenceSingleton = CRDTSingletonTypeRecord<SerializedReference>;
export type ActiveSingletonReferenceStore = ActiveStore<CRDTReferenceSingleton>;
export type SingletonReferenceHandle = SingletonHandle<Reference>;

export type CollectionReferenceType = CollectionType<ReferenceType<EntityType>>;
export type CRDTReferenceCollection = CRDTCollectionTypeRecord<SerializedReference>;
export type ActiveCollectionReferenceStore = ActiveStore<CRDTReferenceCollection>;
export type CollectionReferenceHandle = CollectionHandle<Reference>;

export type SingletonInterfaceType = SingletonType<InterfaceType>;
export type CRDTInterfaceSingleton = CRDTSingletonTypeRecord<StorableSerializedParticleSpec>;
export type ActiveSingletonInterfaceStore = ActiveStore<CRDTInterfaceSingleton>;
export type SingletonInterfaceHandle = SingletonHandle<ParticleSpec>;

export type MuxEntityType = MuxType<EntityType>;
export type CRDTMuxEntity = CRDTEntityTypeRecord<Identified, Identified>;
export type ActiveMuxEntityStore = ActiveStore<CRDTMuxEntity>;
export type MuxEntityHandle = EntityHandleFactory<CRDTMuxEntity>;

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

export function handleType<T extends Handle<CRDTTypeRecord>>(handle: T) {
  return handle.type as HandleToType<T>;
}
