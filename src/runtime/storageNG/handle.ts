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
import { CollectionOpTypes, CRDTCollection, CRDTCollectionTypeRecord } from '../crdt/crdt-collection';
import { StorageProxy } from './storage-proxy';

/**
 * Base class for Handles.
 */
export abstract class Handle<T extends CRDTTypeRecord> {
  storageProxy: StorageProxy<T>;
  key: string;
  clock: VersionMap;
  constructor(key: string, storageProxy: StorageProxy<T>) {
    this.key = key;
    this.storageProxy = storageProxy;
    this.clock = this.storageProxy.registerHandle(this);
  }
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
}
