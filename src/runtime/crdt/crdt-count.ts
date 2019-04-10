// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import { CRDTChange, CRDTModel } from "./crdt.js";

type RawCount = number

type CountData = { values: Map<string, number> };

export enum CountOpTypes { Increment, MultiIncrement }
export type CountOperation = { type: CountOpTypes.MultiIncrement, value: number, actor: string } | 
                             { type: CountOpTypes.Increment, actor: string };

type CountChange = CRDTChange<CountOperation, CountData>;
type CountModel = CRDTModel<CountOperation, CountData, RawCount>;

export class CRDTCount implements CountModel {
  private model: CountData = {values: new Map()};

  merge(other: CountModel): {modelChange: CountChange, otherChange: CountChange} {
    const otherChanges: CountOperation[] = [];
    const thisChanges: CountOperation[] = [];

    const otherRaw = other.getData();

    for (const key of otherRaw.values.keys()) {
      const thisValue = this.model.values.get(key) || 0;
      const otherValue = otherRaw.values.get(key) || 0;
      if (thisValue > otherValue) {
        otherChanges.push({type: CountOpTypes.MultiIncrement, value: thisValue - otherValue, actor: key});
      } else if (otherValue > thisValue) {
        thisChanges.push({type: CountOpTypes.MultiIncrement, value: otherValue - thisValue, actor: key});
        this.model.values.set(key, otherValue);
      }
    }
    
    for (const key of this.model.values.keys()) {
      if (otherRaw.values.has(key)) {
        continue;
      }
      otherChanges.push({type: CountOpTypes.MultiIncrement, value: this.model.values.get(key), actor: key});
    }

    return {modelChange: {changeIsOperations: true, operations: thisChanges}, otherChange: {changeIsOperations: true, operations: otherChanges}};
  }

  applyOperation(op: CountOperation) {
    let value: number;
    if (op.type == CountOpTypes.MultiIncrement) {
      if (op.value < 0) {
        return false;
      }
      value = (this.model.values.get(op.actor) || 0) + op.value;
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