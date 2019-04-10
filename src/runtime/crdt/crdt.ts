/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export type VersionMap = Map<string, number>;

export interface CRDTChange<Ops, Data> {
  changeIsOperations: boolean; // can change be expressed as ops?
  operations?: Ops[];
  modelPostChange?: Data;
}

export interface CRDTModel<Ops, Data, ConsumerType> {
  merge(other: CRDTModel<Ops, Data, ConsumerType>): {modelChange: CRDTChange<Ops, Data>, otherChange: CRDTChange<Ops, Data>} | null; // null implies no change
  applyOperation(op: Ops): boolean; // false implies operation out of order and application failed
  getData(): Data; //
  getParticleView(): ConsumerType; //
}


