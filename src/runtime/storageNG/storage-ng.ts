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
import {Arc} from '../arc.js';
import {SingletonHandle} from './handle.js';
import {Particle} from '../particle.js';
import {CRDTSingletonTypeRecord} from '../crdt/crdt-singleton.js';
import {Referenceable} from '../crdt/crdt-collection.js';
import {ActiveStore} from './store.js';
import {Entity} from '../entity.js';

type HandleOptions = {
  type?: Type;
  ttl?: Ttl;
  particle?: Particle;
  canRead?: boolean;
  canWrite?: boolean;
  name?: string;
};

export type CRDTReferenceableSingleton = CRDTSingletonTypeRecord<Referenceable>;
export type ActiveSingletonEntityStore = ActiveStore<CRDTReferenceableSingleton>;
export type SingletonEntityHandle = SingletonHandle<Entity>;

export function singletonHandle<T extends CRDTReferenceableSingleton, U>(
  store: ActiveStore<T>,
  arc: Arc,
  options?: HandleOptions
): SingletonHandle<U> {
  const type = options && options.type ? options.type : store.baseStore.type;
  const storageKey = store.baseStore.storageKey.toString();
  const ttl = options && options.ttl ? options.ttl : undefined;
  const proxy = new StorageProxy<T>('argument no longer required', store, type, storageKey, ttl);
  const idGenerator = arc.idGenerator;
  const particle = options && options.particle ? options.particle : null;
  const canRead = options && options.canRead ? options.canRead : true;
  const canWrite = options && options.canWrite ? options.canWrite : true;
  const name = options && options.name ? options.name : null;
  return new SingletonHandle(arc.generateID().toString(), proxy, idGenerator, particle, canRead, canWrite, name);
}
