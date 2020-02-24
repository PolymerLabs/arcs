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
import {Type} from '../type.js';
import {Ttl} from '../recipe/ttl.js';
import {SingletonHandle, CollectionHandle} from './handle.js';
import {Particle} from '../particle.js';
import {CRDTSingletonTypeRecord} from '../crdt/crdt-singleton.js';
import {ActiveStore, Store} from './store.js';
import {Entity, SerializedEntity} from '../entity.js';
import {Id, IdGenerator} from '../id.js';
import {ParticleSpec, StorableSerializedParticleSpec} from '../particle-spec.js';
import {Referenceable, CRDTCollectionTypeRecord} from '../crdt/crdt-collection.js';
import {SerializedReference, Reference} from '../reference.js';

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

export type CRDTReferenceableSingleton = CRDTSingletonTypeRecord<Referenceable>;
export type CRDTReferenceableCollection = CRDTCollectionTypeRecord<Referenceable>;

export type CRDTEntitySingleton = CRDTSingletonTypeRecord<SerializedEntity>;
export type SingletonEntityStore = Store<CRDTEntitySingleton>;
export type ActiveSingletonEntityStore = ActiveStore<CRDTEntitySingleton>;
export type SingletonEntityHandle = SingletonHandle<Entity>;

export type CRDTEntityCollection = CRDTCollectionTypeRecord<SerializedEntity>;
export type CollectionEntityStore = Store<CRDTEntityCollection>;
export type ActiveCollectionEntityStore = ActiveStore<CRDTEntityCollection>;
export type CollectionEntityHandle = CollectionHandle<Entity>;

export type CRDTReferenceSingleton = CRDTSingletonTypeRecord<SerializedReference>;
export type SingletonReferenceStore = Store<CRDTReferenceSingleton>;
export type ActiveSingletonReferenceStore = ActiveStore<CRDTReferenceSingleton>;
export type SingletonReferenceHandle = SingletonHandle<Reference>;

export type CRDTReferenceCollection = CRDTCollectionTypeRecord<SerializedReference>;
export type CollectionReferenceStore = Store<CRDTReferenceCollection>;
export type ActiveCollectionReferenceStore = ActiveStore<CRDTReferenceCollection>;
export type CollectionReferenceHandle = CollectionHandle<Reference>;

export type CRDTInterfaceSingleton = CRDTSingletonTypeRecord<StorableSerializedParticleSpec>;
export type SingletonInterfaceStore = Store<CRDTInterfaceSingleton>;
export type ActiveSingletonInterfaceStore = ActiveStore<CRDTInterfaceSingleton>;
export type SingletonInterfaceHandle = SingletonHandle<ParticleSpec>;

export function singletonHandle<T extends CRDTReferenceableSingleton, U>(
  store: ActiveStore<T>,
  arc: ArcLike,
  options?: HandleOptions
): SingletonHandle<U> {
  const type = options && options.type ? options.type : store.baseStore.type;
  const storageKey = store.baseStore.storageKey.toString();
  const ttl = options && options.ttl ? options.ttl : undefined;
  const proxy = new StorageProxy<T>(store.baseStore.id, store, type, storageKey, ttl);
  const idGenerator = arc.idGenerator;
  const particle = options && options.particle ? options.particle : null;
  const canRead = options && options.canRead ? options.canRead : true;
  const canWrite = options && options.canWrite ? options.canWrite : true;
  const name = options && options.name ? options.name : null;
  return new SingletonHandle(arc.generateID().toString(), proxy, idGenerator, particle, canRead, canWrite, name);
}

export function collectionHandle<T extends CRDTReferenceableCollection, U>(
  store: ActiveStore<T>,
  arc: ArcLike,
  options?: HandleOptions
): CollectionHandle<U> {
  const type = options && options.type ? options.type : store.baseStore.type;
  const storageKey = store.baseStore.storageKey.toString();
  const ttl = options && options.ttl ? options.ttl : undefined;
  const proxy = new StorageProxy<T>(store.baseStore.id, store, type, storageKey, ttl);
  const idGenerator = arc.idGenerator;
  const particle = options && options.particle ? options.particle : null;
  const canRead = options && options.canRead ? options.canRead : true;
  const canWrite = options && options.canWrite ? options.canWrite : true;
  const name = options && options.name ? options.name : null;
  return new CollectionHandle(arc.generateID().toString(), proxy, idGenerator, particle, canRead, canWrite, name);
}
