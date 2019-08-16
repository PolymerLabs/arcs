/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ChangeType, CRDTChange, CRDTError, CRDTModel, CRDTTypeRecord, VersionMap} from './crdt.js';
import {Dictionary} from '../hot.js';

type RawCollection<T> = Set<T>;

export interface Referenceable {
  id: string;
}

type CollectionData<T extends Referenceable> = {
  values: Dictionary<{value: T, version: VersionMap}>,
  version: VersionMap
};

export enum CollectionOpTypes {
  Add,
  Remove,
  FastForward,
}
export type CollectionOperation<T> = {
  type: CollectionOpTypes.Add,
  added: T,
  actor: string,
  clock: VersionMap
} | {
  type: CollectionOpTypes.Remove,
  removed: T,
  actor: string,
  clock: VersionMap
} | CollectionFastForwardOp<T>;

export type CollectionFastForwardOp<T> = {
  type: CollectionOpTypes.FastForward,
  added: [T, VersionMap][],
  removed: T[],
  oldClock: VersionMap,
  newClock: VersionMap,
};

export interface CRDTCollectionTypeRecord<T extends Referenceable> extends CRDTTypeRecord {
  data: CollectionData<T>;
  operation: CollectionOperation<T>;
  consumerType: RawCollection<T>;
}

type CollectionChange<T extends Referenceable> = CRDTChange<CRDTCollectionTypeRecord<T>>;

type CollectionModel<T extends Referenceable> = CRDTModel<CRDTCollectionTypeRecord<T>>;

export class CRDTCollection<T extends Referenceable> implements CollectionModel<T> {
  private model: CollectionData<T> = {values: {}, version: {}};

  merge(other: CollectionData<T>): {modelChange: CollectionChange<T>, otherChange: CollectionChange<T>} {
    const newClock = mergeVersions(this.model.version, other.version);
    const merged: Dictionary<{value: T, version: VersionMap}> = {};

    // Fast-forward op to send to other model. Elements added and removed will
    // be filled in below.
    const fastForwardOp: CollectionFastForwardOp<T> = {
      type: CollectionOpTypes.FastForward,
      added: [],
      removed: [],
      oldClock: other.version,
      newClock,
    };

    for (const otherEntry of Object.values(other.values)) {
      const value = otherEntry.value;
      const id = value.id;
      const thisEntry = this.model.values[id];

      if (thisEntry) {
        if (sameVersions(thisEntry.version, otherEntry.version)) {
          // Both models have the same value at the same version. Add it to the
          // merge.
          merged[id] = thisEntry;
        } else {
          // Models have different versions for the same value. Merge the
          // versions, and update other.
          const mergedVersion = mergeVersions(thisEntry.version, otherEntry.version);
          merged[id] = {value, version: mergedVersion};
          fastForwardOp.added.push([value, mergedVersion]);
        }
      } else if (dominates(this.model.version, otherEntry.version)) {
        // Value was deleted by this model.
        fastForwardOp.removed.push(value);
      } else {
        // Value was added by other model.
        merged[id] = otherEntry;
      }
    }
    for (const thisEntry of Object.values(this.model.values)) {
      const id = thisEntry.value.id;
      if (!other.values[id] && !dominates(other.version, thisEntry.version)) {
        // Value was added by this model.
        merged[id] = thisEntry;
        fastForwardOp.added.push([thisEntry.value, thisEntry.version]);
      }
    }

    this.model.values = merged;
    this.model.version = newClock;
    
    const modelChange: CollectionChange<T> = {
      changeType: ChangeType.Model,
      modelPostChange: this.model
    };
    const otherChange: CollectionChange<T> = {
      changeType: ChangeType.Operations,
      operations: [fastForwardOp],
    };
    return {modelChange, otherChange};
  }

  applyOperation(op: CollectionOperation<T>): boolean {
    switch (op.type) {
      case CollectionOpTypes.Add:
        return this.add(op.added, op.actor, op.clock);
      case CollectionOpTypes.Remove:
        return this.remove(op.removed, op.actor, op.clock);
      case CollectionOpTypes.FastForward:
        return this.fastForward(op);
      default:
        throw new CRDTError(`Op ${op} not supported`);
    }
  }

  getData(): CollectionData<T> {
    return this.model;
  }

  getParticleView(): RawCollection<T> {
    return new Set(Object.values(this.model.values).map(entry => entry.value));
  }

  private add(value: T, key: string, version: VersionMap): boolean {
    // Only accept an add if it is immediately consecutive to the clock for that actor.
    const expectedClockValue = (this.model.version[key] || 0) + 1;
    if (!(expectedClockValue === version[key] || 0)) {
      return false;
    }
    this.model.version[key] = version[key];
    const previousVersion = this.model.values[value.id] ? this.model.values[value.id].version : {};
    this.model.values[value.id] = {value, version: mergeVersions(version, previousVersion)};
    return true;
  }

  private remove(value: T, key: string, version: VersionMap): boolean {
    if (!this.model.values[value.id]) {
      return false;
    }
    const clockValue = (version[key] || 0);
    // Removes do not increment the clock.
    const expectedClockValue = (this.model.version[key] || 0);
    if (!(expectedClockValue === clockValue)) {
      return false;
    }
    // Cannot remove an element unless version is higher for all other actors as
    // well.
    if (!dominates(version, this.model.values[value.id].version)) {
      return false;
    }
    this.model.version[key] = clockValue;
    delete this.model.values[value.id];
    return true;
  }

  private fastForward(op: CollectionFastForwardOp<T>): boolean {
    const currentClock = this.model.version;
    if (!dominates(currentClock, op.oldClock)) {
      // Can't apply fast-forward op. Current model's clock is behind oldClock.
      return false;
    }
    if (dominates(currentClock, op.newClock)) {
      // Current model already knows about everything in this fast-forward op.
      return false;
    }
    for (const [value, version] of op.added) {
      const existingValue = this.model.values[value.id];
      if (existingValue) {
        existingValue.version = mergeVersions(existingValue.version, version);
      } else if (!dominates(currentClock, version)) {
        this.model.values[value.id] = {value, version};
      }
    }
    for (const value of op.removed) {
      const existingValue = this.model.values[value.id];
      if (existingValue && dominates(op.newClock, existingValue.version)) {
        delete this.model.values[value.id];
      }
    }
    this.model.version = mergeVersions(currentClock, op.newClock);
    return true;
  }
}

function mergeVersions(version1: VersionMap, version2: VersionMap): VersionMap {
  const merged = {};
  for (const [k, v] of Object.entries(version1)) {
    merged[k] = v;
  }
  for (const [k, v] of Object.entries(version2)) {
    merged[k] = Math.max(v, version1[k] || 0);
  }
  return merged;
}

function sameVersions(version1: VersionMap, version2: VersionMap): boolean {
  if (Object.keys(version1).length !== Object.keys(version2).length) {
    return false;
  }
  for (const [k, v] of Object.entries(version1)) {
    if (v !== version2[k]) {
      return false;
    }
  }
  return true;
}

/** Returns true if map1 dominates map2. */
function dominates(map1: VersionMap, map2: VersionMap): boolean {
  for (const [k, v] of Object.entries(map2)) {
    if ((map1[k] || 0) < v) {
      return false;
    }
  }
  return true;
}
