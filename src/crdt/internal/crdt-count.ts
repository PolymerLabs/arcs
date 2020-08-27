/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {VersionMap, CRDTChange, CRDTModel, CRDTError, ChangeType, CRDTTypeRecord} from './crdt.js';
import {Dictionary} from '../../utils/hot.js';

type RawCount = number;

export type CountData = {values: Dictionary<number>, version: VersionMap};

type VersionInfo = {from: number, to: number};

export enum CountOpTypes {Increment, MultiIncrement}
export type CountOperation = {type: CountOpTypes.MultiIncrement, value: number, actor: string, version: VersionInfo} |
                             {type: CountOpTypes.Increment, actor: string, version: VersionInfo};

export interface CRDTCountTypeRecord extends CRDTTypeRecord {
  data: CountData;
  operation: CountOperation;
  consumerType: RawCount;
}

type CountModel = CRDTModel<CRDTCountTypeRecord>;
type CountChange = CRDTChange<CRDTCountTypeRecord>;

export class CRDTCount implements CountModel {
  private model: CountData = {values: {}, version: {}};

  merge(other: CountData): {modelChange: CountChange, otherChange: CountChange} {
    const otherChanges: CountOperation[] = [];
    const thisChanges: CountOperation[] = [];

    for (const key of Object.keys(other.values)) {
      const thisValue = this.model.values[key] || 0;
      const otherValue = other.values[key] || 0;
      const thisVersion = this.model.version[key] || 0;
      const otherVersion = other.version[key] || 0;
      if (thisValue > otherValue) {
        if (otherVersion >= thisVersion) {
          throw new CRDTError('Divergent versions encountered when merging CRDTCount models');
        }
        otherChanges.push({type: CountOpTypes.MultiIncrement, value: thisValue - otherValue, actor: key,
                           version: {from: otherVersion, to: thisVersion}});
      } else if (otherValue > thisValue) {
        if (thisVersion >= otherVersion) {
          throw new CRDTError('Divergent versions encountered when merging CRDTCount models');
        }
        thisChanges.push({type: CountOpTypes.MultiIncrement, value: otherValue - thisValue, actor: key,
                          version: {from: thisVersion, to: otherVersion}});
        this.model.values[key] = otherValue;
        this.model.version[key] = otherVersion;
      }
    }

    for (const key of Object.keys(this.model.values)) {
      if (other.values[key]) {
        continue;
      }
      if (other.version[key]) {
        throw new CRDTError(`CRDTCount model has version but no value for key ${key}`);
      }
      otherChanges.push({type: CountOpTypes.MultiIncrement, value: this.model.values[key], actor: key,
                         version: {from: 0, to: this.model.version[key]}});
    }

    return {modelChange: {changeType: ChangeType.Operations, operations: thisChanges}, otherChange: {changeType: ChangeType.Operations, operations: otherChanges}};
  }

  applyOperation(op: CountOperation) {
    let value: number;
    if (op.version.from !== (this.model.version[op.actor] || 0)) {
      return false;
    }
    if (op.version.to <= op.version.from) {
      return false;
    }
    if (op.type === CountOpTypes.MultiIncrement) {
      if (op.value < 0) {
        return false;
      }
      value = (this.model.values[op.actor] || 0) + op.value;
    } else {
      value = (this.model.values[op.actor] || 0) + 1;
    }

    this.model.values[op.actor] = value;
    this.model.version[op.actor] = op.version.to;
    return true;
  }

  private cloneMap<V>(map: Dictionary<V>) {
    const result: Dictionary<V> = {};
    Object.keys(map).forEach(key => result[key] = map[key]);
    return result;
  }

  getData() {
    return {values: this.cloneMap(this.model.values), version: this.cloneMap(this.model.version)};
  }

  getParticleView() {
    return Object.values(this.model.values).reduce((prev, current) => prev + current, 0);
  }
}
