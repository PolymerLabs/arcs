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
import {CRDTOperation, CRDTTypeRecord, VersionMap} from '../crdt/crdt';
import {CollectionOperation, CollectionOpTypes, CRDTCollection, CRDTCollectionTypeRecord, Referenceable} from '../crdt/crdt-collection';
import {CRDTSingleton, CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../crdt/crdt-singleton';
import {Particle} from '../particle';

import {StorageProxy} from './storage-proxy';

export interface HandleOptions {
  keepSynced: boolean;
  notifySync: boolean;
  notifyUpdate: boolean;
  notifyDesync: boolean;
}

/**
 * Base class for Handles.
 */
export abstract class Handle<T extends CRDTTypeRecord> {
  storageProxy: StorageProxy<T>;
  key: string;
  clock: VersionMap;
  options: HandleOptions;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  particle: Particle;
  constructor(
      key: string,
      storageProxy: StorageProxy<T>,
      particle: Particle,
      canRead: boolean,
      canWrite: boolean) {
    this.key = key;
    this.storageProxy = storageProxy;
    this.particle = particle;
    this.options = {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    };
    this.canRead = canRead;
    this.canWrite = canWrite;
    this.clock = this.storageProxy.registerHandle(this);
  }
  configure(options: HandleOptions): void {
    assert(this.canRead, 'configure can only be called on readable Handles');
    this.options = options;
  }
  abstract onUpdate(updates: T['operation'][]): void;
  // TODO: this shuld be async and return Promise<void>.
  abstract onSync(): void;
  onDesync(): void {
  }
}

/**
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set.
 */
export class CollectionHandle<T extends Referenceable> extends Handle<CRDTCollectionTypeRecord<T>> {
  async get(id: string): Promise<T> {
    const data = await this.storageProxy.getData();
    return data.values[id].value;    
  }

  async add(entity: T): Promise<boolean> {
    this.clock[this.key] = (this.clock[this.key] || 0) + 1; 
    const op: CRDTOperation = {
      type: CollectionOpTypes.Add,
      added: entity,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async addMultiple(entities: T[]): Promise<boolean> {
    return Promise.all(entities.map(e => this.add(e))).then(array => array.every(Boolean));    
  }

  async remove(entity: T): Promise<boolean> {
    const op: CRDTOperation = {
      type: CollectionOpTypes.Remove,
      removed: entity,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async clear(): Promise<boolean> {
    const values:T[]  = await this.toList();    
    for (const value of values) {
      const removeOp: CRDTOperation = {
        type: CollectionOpTypes.Remove,
        removed: value,
        actor: this.key,
        clock: this.clock,
      };
      if (!this.storageProxy.applyOp(removeOp)) {
        return false;
      }
    }
    return true;
  }

  async toList(): Promise<T[]> {
    return this.storageProxy.getParticleView().then(set => [...set]);
  }

  onUpdate(ops: CollectionOperation<T>[]) {
    for (const op of ops) {
      // Pass the change up to the particle.
      // tslint:disable-next-line: no-any
      const update: {added?: any, removed?: any, originator?: any} = {};
      if (op.type === CollectionOpTypes.Add) {
        update.added = op.added;
      }
      if (op.type === CollectionOpTypes.Remove) {
        update.removed = op.removed;
      }
      update.originator = (this.key === op.actor);
      // TODO: call onHandleUpdate on the particle, eg:
      // this.particle.onHandleUpdate(this /*handle*/, update);
    }
  }

  onSync() {
    // TODO: call onHandleSync on the particle, eg:
    // particle.onHandleSync(this /*handle*/, this.toList() /*model*/);
  }
}

/**
 * A handle on a single entity.
 */
export class SingletonHandle<T extends Referenceable> extends Handle<CRDTSingletonTypeRecord<T>> {
  async set(entity: T): Promise<boolean> {
    this.clock[this.key] = (this.clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: SingletonOpTypes.Set,
      value: entity,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async clear(): Promise<boolean> {
    const op: CRDTOperation = {
      type: SingletonOpTypes.Clear,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async get(): Promise<T> {
    return this.storageProxy.getParticleView();
  }

  onUpdate(ops: SingletonOperation<T>[]) {
    for (const op of ops) {
      // Pass the change up to the particle.
      // tslint:disable-next-line: no-any
      const update: {data?: any, originator?: any} = {};
      if (op.type === SingletonOpTypes.Set) {
        // TODO: do we also need to set oldData?
        update.data = op.value;
      }
      if (op.type === SingletonOpTypes.Clear) {
        // TODO: what update should we return here?
      }
      update.originator = (this.key === op.actor);
      // TODO: call onHandleUpdate on the particle, eg:
      // this.particle.onHandleUpdate(this /*handle*/, update);
    }
  }

  onSync() {
    // TODO: call onHandleSync on the particle, eg:
    // particle.onHandleSync(this /*handle*/, this.get() /*model*/);
  }
}
