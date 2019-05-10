/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ChangeType, CRDTChange, CRDTError, CRDTModel, CRDTTypeRecord, VersionMap} from './crdt';

type RawCollection<T> = Set<T>;

type CollectionData<T> = {
  values: Map<T, VersionMap>,
  version: VersionMap
};

export enum CollectionOpTypes {
  Add,
  Remove
}
export type CollectionOperation<T> = {
  type: CollectionOpTypes.Add,
  added: T,
  actor: string,
  clock: VersionMap
}|{
  type: CollectionOpTypes.Remove,
  removed: T,
  actor: string,
  clock: VersionMap
};

export interface CRDTCollectionTypeRecord<T> extends CRDTTypeRecord {
  data: CollectionData<T>;
  operation: CollectionOperation<T>;
  consumerType: RawCollection<T>;
}

type CollectionChange<T> = CRDTChange<CRDTCollectionTypeRecord<T>>;

type CollectionModel<T> = CRDTModel<CRDTCollectionTypeRecord<T>>;

export class CRDTCollection<T> implements CollectionModel<T> {
  private model: CollectionData<T> = {values: new Map(), version: new Map()};

  merge(other: CollectionData<T>):
      {modelChange: CollectionChange<T>, otherChange: CollectionChange<T>} {
    const newValues = this.mergeItems(this.model, other);
    const newVersion =
        mergeVersions(this.model.version, other.version);
    this.model.values = newValues;
    this.model.version = newVersion;
    // For now this is always returning a model change.
    const change: CollectionChange<T> = {
      changeType: ChangeType.Model,
      modelPostChange: this.model
    };
    return {modelChange: change, otherChange: change};
  }

  applyOperation(op: CollectionOperation<T>): boolean {
    if (op.type === CollectionOpTypes.Add) {
      return this.add(op.added, op.actor, op.clock);
    }
    if (op.type === CollectionOpTypes.Remove) {
      return this.remove(op.removed, op.actor, op.clock);
    }
    throw new CRDTError(`Op ${op} not supported`);
  }
  getData(): CollectionData<T> {
    return this.model;
  }
  getParticleView(): RawCollection<T> {
    return new Set([...this.model.values.keys()]);
  }

  private add(value: T, key: string, version: VersionMap): boolean {
    // Only accept an add if it is immediately consecutive to the clock for that actor.
    const expectedClockValue = (this.model.version.get(key) || 0) + 1;
    if (!(expectedClockValue === version.get(key) || 0)) {
      return false;
    }
    this.model.version.set(key, version.get(key));
    this.model.values.set(value,mergeVersions(version, this.model.values.get(value) || new Map()));
    return true;
  }

  private remove(value: T, key: string, version: VersionMap): boolean {
    if (!this.model.values.has(value)) {
      return false;
    }
    const clockValue = (version.get(key) || 0);
    // Removes do not increment the clock.
    const expectedClockValue = (this.model.version.get(key) || 0);
    if (!(expectedClockValue === clockValue)) {
      return false;
    }
    // Cannot remove an element unless version is higher for all other actors as
    // well.
    if (!dominates(version, this.model.values.get(value))) {
      return false;
    }
    this.model.version.set(key, clockValue);
    this.model.values.delete(value);
    return true;
  }

  private mergeItems(data1: CollectionData<T>, data2: CollectionData<T>): Map<T, VersionMap> {
    const merged = new Map();
    for (const [value, version2] of data2.values) {
      const version1 = data1.values.get(value);
      if (version1) {
        merged.set(value, mergeVersions(version1, version2));
      } else if (!dominates(data1.version, version2)) {
        merged.set(value, version2);
      }
    }
    for (const [value, version1] of data1.values) {
      if (!data2.values.get(value) && !dominates(data2.version, version1)) {
        merged.set(value, version1);
      }
    }
    return merged;
  }
}

function mergeVersions(version1: VersionMap, version2: VersionMap): VersionMap {
  const merged = new Map(version1);
  for (const [k, v] of version2) {
    merged.set(k, Math.max(v, version1.get(k) || 0));
  }
  return merged;
}

function dominates(map1: VersionMap, map2: VersionMap): boolean {
  for (const [k, v] of map2) {
    if ((map1.get(k) || 0) < v) {
      return false;
    }
  }
  return true;
}
