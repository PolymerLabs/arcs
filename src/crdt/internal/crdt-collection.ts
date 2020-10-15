/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ChangeType, CRDTChange, CRDTError, CRDTModel, CRDTTypeRecord, VersionMap, Referenceable, createEmptyChange} from './crdt.js';
import {Dictionary} from '../../utils/lib-utils.js';
import {assert} from '../../platform/assert-web.js';

type RawCollection<T> = Set<T>;

export type CollectionData<T extends Referenceable> = {
  values: Dictionary<{value: T, version: VersionMap}>,
  version: VersionMap
};

export enum CollectionOpTypes {
  Add,
  Remove,
  FastForward,
}

export type CollectionFastForwardOp<T> = {type: CollectionOpTypes.FastForward, added: [T, VersionMap][], removed: T[], oldVersionMap: VersionMap, newVersionMap: VersionMap};
export type CollectionOperationAdd<T> = {type: CollectionOpTypes.Add, added: T, actor: string, versionMap: VersionMap};
export type CollectionOperationRemove<T> = {type: CollectionOpTypes.Remove, removed: T, actor: string, versionMap: VersionMap};

export type CollectionOperation<T> = CollectionOperationAdd<T> | CollectionOperationRemove<T> | CollectionFastForwardOp<T>;

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
    // Ensure we never send an update if the two versions are already the same.
    // TODO(shans): Remove this once fast-forwarding is two-sided, and replace with
    // a check for an effect-free fast-forward op in each direction instead.
    if (sameVersions(this.model.version, other.version)) {
      let entriesMatch = true;
      const theseKeys = Object.keys(this.model.values);
      const otherKeys = Object.keys(other.values);
      if (theseKeys.length === otherKeys.length) {
        for (const key of Object.keys(this.model.values)) {
          if (!other.values[key]) {
            entriesMatch = false;
            break;
          }
        }
        if (entriesMatch) {
          return {modelChange: createEmptyChange(), otherChange: createEmptyChange()};
        }
      }
    }

    const newVersionMap = mergeVersions(this.model.version, other.version);
    const merged: Dictionary<{value: T, version: VersionMap}> = {};

    // Fast-forward op to send to other model. Elements added and removed will
    // be filled in below.
    const fastForwardOp: CollectionFastForwardOp<T> = {
      type: CollectionOpTypes.FastForward,
      added: [],
      removed: [],
      oldVersionMap: other.version,
      newVersionMap,
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
    for (const [id, thisEntry] of Object.entries(this.model.values)) {
      if (!other.values[id] && !dominates(other.version, thisEntry.version)) {
        // Value was added by this model.
        merged[id] = thisEntry;
        fastForwardOp.added.push([thisEntry.value, thisEntry.version]);
      }
    }

    const operations = simplifyFastForwardOp(fastForwardOp) || [fastForwardOp];

    this.model.values = merged;
    this.model.version = newVersionMap;

    const modelChange: CollectionChange<T> = {
      changeType: ChangeType.Model,
      modelPostChange: this.model
    };
    const otherChange: CollectionChange<T> = {
      changeType: ChangeType.Operations,
      operations,
    };
    return {modelChange, otherChange};
  }

  applyOperation(op: CollectionOperation<T>): boolean {
    switch (op.type) {
      case CollectionOpTypes.Add:
        return this.add(op.added, op.actor, op.versionMap);
      case CollectionOpTypes.Remove:
        return this.remove(op.removed, op.actor, op.versionMap);
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
    this.checkValue(value);
    // Only accept an add if it is immediately consecutive to the versionMap for that actor.
    const expectedVersionMapValue = (this.model.version[key] || 0) + 1;
    if (!(expectedVersionMapValue === version[key] || 0)) {
      return false;
    }
    this.model.version[key] = version[key];
    const previousVersion = this.model.values[value.id] ? this.model.values[value.id].version : {};
    const newValue = this.model.values[value.id] ? this.model.values[value.id].value : value;
    this.model.values[value.id] = {value: newValue, version: mergeVersions(version, previousVersion)};
    return true;
  }

  private remove(value: T, key: string, version: VersionMap): boolean {
    this.checkValue(value);
    if (!this.model.values[value.id]) {
      return false;
    }
    const versionMapValue = (version[key] || 0);
    // Removes do not increment the VersionMap.
    const expectedVersionMapValue = (this.model.version[key] || 0);
    if (!(expectedVersionMapValue === versionMapValue)) {
      return false;
    }
    // Cannot remove an element unless version is higher for all other actors as
    // well.
    if (!dominates(version, this.model.values[value.id].version)) {
      return false;
    }
    this.model.version[key] = versionMapValue;
    delete this.model.values[value.id];
    return true;
  }

  private fastForward(op: CollectionFastForwardOp<T>): boolean {
    const currentVersionMap = this.model.version;
    if (!dominates(currentVersionMap, op.oldVersionMap)) {
      // Can't apply fast-forward op. Current model's VersionMap is behind oldVersionMap.
      return false;
    }
    if (dominates(currentVersionMap, op.newVersionMap)) {
      // Current model already knows about everything in this fast-forward op.
      // Nothing to do, but not an error.
      return true;
    }
    for (const [value, version] of op.added) {
      this.checkValue(value);
      const existingValue = this.model.values[value.id];
      if (existingValue) {
        existingValue.version = mergeVersions(existingValue.version, version);
      } else if (!dominates(currentVersionMap, version)) {
        this.model.values[value.id] = {value, version};
      }
    }
    for (const value of op.removed) {
      this.checkValue(value);
      const existingValue = this.model.values[value.id];
      if (existingValue && dominates(op.newVersionMap, existingValue.version)) {
        delete this.model.values[value.id];
      }
    }
    this.model.version = mergeVersions(currentVersionMap, op.newVersionMap);
    return true;
  }

  private checkValue(value: T) {
    assert(value.id && value.id.length, `CRDT value must have an ID.`);
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

/**
 * Converts a simple fast-forward operation into a sequence of regular ops.
 * Currently only supports converting add ops made by a single actor. Returns
 * null if it could not simplify the fast-forward operation.
 */
export function simplifyFastForwardOp<T>(fastForwardOp: CollectionFastForwardOp<T>): CollectionOperation<T>[] {
  if (fastForwardOp.removed.length > 0) {
    // Remove ops can't be replayed in order.
    return null;
  }
  if (fastForwardOp.added.length === 0) {
    if (sameVersions(fastForwardOp.oldVersionMap, fastForwardOp.newVersionMap)) {
      // No added, no removed, and no versionMap changes: op should be empty.
      return [];
    }
    // Just a version bump, no add ops to replay.
    return null;
  }
  const actor = getSingleActorIncrement(fastForwardOp.oldVersionMap, fastForwardOp.newVersionMap);
  if (actor === null) {
    return null;
  }
  // Sort the add ops in increasing order by the actor's version.
  const addOps = [...fastForwardOp.added].sort(([elem1, v1], [elem2, v2]) => (v1[actor] || 0) - (v2[actor] || 0));
  let expectedVersion = fastForwardOp.oldVersionMap[actor] || 0;
  for (const [elem, version] of addOps) {
    if (++expectedVersion !== version[actor]) {
      // The add op didn't match the expected increment-by-one pattern. Can't
      // replay it properly.
      return null;
    }
  }
  // If we reach here then all added versions are incremented by one.
  // Check the final versionMap.
  const expectedVersionMap = {...fastForwardOp.oldVersionMap};
  expectedVersionMap[actor] = expectedVersion;
  if (!sameVersions(expectedVersionMap, fastForwardOp.newVersionMap)) {
    return null;
  }
  return addOps.map(([elem, version]) => ({
    type: CollectionOpTypes.Add,
    added: elem,
    actor,
    versionMap: version,
  }));
}

/**
 * Given two version maps, returns the actor who incremented their version. If
 * there's more than one such actor, returns null.
 */
function getSingleActorIncrement(oldVersion: VersionMap, newVersion: VersionMap): string | null {
  const incrementedActors = Object.entries(newVersion).filter(([k, v]) => v > (oldVersion[k] || 0));
  return incrementedActors.length === 1 ? incrementedActors[0][0] : null;
}
