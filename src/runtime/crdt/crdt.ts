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

// A CRDT model is parameterized by:
//  - the operations that can be applied
//  - the internal data representation of the model
//  - the external (particle-facing) data representation of the model
// A CRDT model can:
//  - merge with other models. This produces a 2-sided delta 
//    (change from this model to merged model, change from other model to merged model)
//  - apply an operation. This might fail (e.g. if the operation is out-of-order), in which case
//    applyOperation() will return false.
//  - report on internal data
//  - report on the particle's view of the data.
export interface CRDTModel<Ops, Data, ConsumerType> {
  merge(other: CRDTModel<Ops, Data, ConsumerType>): {modelChange: CRDTChange<Ops, Data>, otherChange: CRDTChange<Ops, Data>} | null; // null implies no change
  applyOperation(op: Ops): boolean;
  getData(): Data;
  getParticleView(): ConsumerType;
}

// A CRDT Change represents a delta between model states. Where possible,
// this delta should be expressed as a sequence of operations; in which case
// changeIsOperations will be true.
// Sometimes it isn't possible to express a delta as operations. In this case,
// changeIsOperations will be false, and a full post-merge model will be supplied.
// A CRDT Change is parameterized by the operations that can be represented, and the data representation
// of the model.
export interface CRDTChange<Ops, Data> {
  changeIsOperations: boolean;
  operations?: Ops[];
  modelPostChange?: Data;
}



