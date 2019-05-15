/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import { CRDTOperation, CRDTTypeRecord, VersionMap } from '../crdt/crdt';
import {CollectionOperation, CollectionOpTypes, CRDTCollection, CRDTCollectionTypeRecord} from '../crdt/crdt-collection';
import {CRDTSingleton, CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../crdt/crdt-singleton';
import {Particle} from '../particle';

import { StorageProxy } from './storage-proxy';

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
  particle: Particle;
  constructor(key: string, storageProxy: StorageProxy<T>, particle: Particle) {
    this.key = key;
    this.storageProxy = storageProxy;
    this.clock = this.storageProxy.registerHandle(this);
    this.particle = particle;
    this.options = {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    };
  }
  configure(options: HandleOptions): void {
    this.options = options;
  }
  abstract onUpdate(updates: T['operation'][]): void;
  // TODO: this shuld be async and return Promise<void>.
  abstract onSync(): void;
}

/**
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set.
 */
export class CollectionHandle<T> extends Handle<CRDTCollectionTypeRecord<T>> {
  add(entity: T): boolean {
    this.clock.set(this.key, (this.clock.get(this.key) || 0) + 1);
    const op: CRDTOperation = {
      type: CollectionOpTypes.Add,
      added: entity,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  addMultiple(entities: T[]): boolean {
    for (const e of entities) {
      if (!this.add(e)) {
        return false;
      }
    }
    return true;
  }

  remove(entity: T): boolean {
    const op: CRDTOperation = {
      type: CollectionOpTypes.Remove,
      removed: entity,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  clear(): boolean {
    for (const value of this.toList()) {
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

  toList(): T[] {
    return [...this.storageProxy.getParticleView()];
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
    // particle.onHandleSync(this /*handle*/, this.toSet() /*model*/);
  }
}

/**
 * A handle on a single entity.
 */
export class SingletonHandle<T> extends Handle<CRDTSingletonTypeRecord<T>> {
  set(entity: T): boolean {
    this.clock.set(this.key, (this.clock.get(this.key) || 0) + 1);
    const op: CRDTOperation = {
      type: SingletonOpTypes.Set,
      value: entity,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  clear(): boolean {
    const op: CRDTOperation = {
      type: SingletonOpTypes.Clear,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  get(): T {
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
