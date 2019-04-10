// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import { VersionMap, CRDTChange, CRDTModel } from "./crdt.js";

type RawCount = number

type RawCRDTCount = { values: Map<string, number> };

export enum CRDTCountOpTypes { CountIncrement, CountSet }
export type CRDTCountOperation = { type: CRDTCountOpTypes.CountSet, value: number, actor: string } | 
                          { type: CRDTCountOpTypes.CountIncrement, actor: string };

type CRDTCountChange = CRDTChange<CRDTCountOperation, RawCRDTCount>;
type CRDTCountModel = CRDTModel<CRDTCountOperation, RawCRDTCount, RawCount>;

export class CRDTCount implements CRDTCountModel {
  private model: RawCRDTCount = {values: new Map()};

  merge(other: CRDTCountModel): {modelChange: CRDTCountChange, otherChange: CRDTCountChange} {
    const otherChanges: CRDTCountOperation[] = [];
    const thisChanges: CRDTCountOperation[] = [];

    const otherRaw = other.getData();    
    for (const key in otherRaw.values.keys()) {
      const thisValue = this.model.values.get(key) || 0;
      const otherValue = otherRaw.values.get(key) || 0;
      if (thisValue > otherValue) {
        otherChanges.push({type: CRDTCountOpTypes.CountSet, value: thisValue, actor: key});
      } else if (otherValue > thisValue) {
        thisChanges.push({type: CRDTCountOpTypes.CountSet, value: otherValue, actor: key});
        this.model.values.set(key, otherValue);
      }
    }
    
    for (const key in this.model.values.keys()) {
      if (otherRaw.values.has(key)) {
        continue;
      }
      otherChanges.push({type: CRDTCountOpTypes.CountSet, value: this.model.values.get(key), actor: key});
    }

    return {modelChange: {changeIsOperations: true, operations: thisChanges}, otherChange: {changeIsOperations: true, operations: otherChanges}};
  }

  applyOperation(op: CRDTCountOperation) {
    let value: number;
    if (op.type == CRDTCountOpTypes.CountSet) {
      if (op.value < 0) {
        return false;
      }
      if (this.model.values.has(op.actor) && this.model.values.get(op.actor) > op.value) {
        return false;
      }
      value = op.value;
    } else {
      value = (this.model.values.get(op.actor) || 0) + 1;
    }

    this.model.values.set(op.actor, value);
    return true;
  }

  getData() {
    return this.model;
  }

  getParticleView(): RawCount {
    return [...this.model.values.values()].reduce((prev, current) => prev + current, 0);
  }
}