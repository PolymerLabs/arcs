/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from '../../utils/lib-utils.js';

export type VersionMap = Dictionary<number>;

export interface Referenceable {
  id: string;
}

export class CRDTError extends Error {
}

export interface CRDTOperation {}
export interface CRDTData {
  version: VersionMap;
}
interface CRDTConsumerType {}

// A CRDT model is parameterized by:
//  - the operations that can be applied
//  - the internal data representation of the model
//  - the external (particle-facing) data representation of the model
// These type parameters are wrapped up into a single CRDTTypeRecord interface
// that can be extended as a unit by CRDT implementation. This allows users
// of CRDT classes to be generic on a single type parameter.
//
// Note that this interface and its subclasses are intended never to be
// implemented; instead they are a convenient way of associating the set of types
// required in a CRDT implementation together.
export interface CRDTTypeRecord {
  data: CRDTData;
  operation: CRDTOperation;
  consumerType: CRDTConsumerType;
}

// A CRDT model can:
//  - merge with other models. This produces a 2-sided delta
//    (change from this model to merged model, change from other model to merged model).
//    Note that merge updates the model it is invoked on; the modelChange return value is
//    a record of a change that has already been applied.
//  - apply an operation. This might fail (e.g. if the operation is out-of-order), in which case
//    applyOperation() will return false.
//  - report on internal data
//  - report on the particle's view of the data.
//
// It is possible that two models can't merge. For example, they may have had divergent operations apply.
// This is a serious error and will result in merge throwing a CRDTError.
export interface CRDTModel<T extends CRDTTypeRecord> {
  merge(other: T['data']): {modelChange: CRDTChange<T>, otherChange: CRDTChange<T>};
  // note that the object-access syntax here & below is in fact a type-level action; op is constrained to
  // be of the type of the operation field in T, which extends CRDTTypeRecord.
  applyOperation(op: T['operation']): boolean;
  getData(): T['data'];
  getParticleView(): T['consumerType'];
}

export enum CRDTType {Singleton, Collection, Entity}

// A CRDT Change represents a delta between model states. Where possible,
// this delta should be expressed as a sequence of operations; in which case
// changeType will be ChangeType.Operations.
// Sometimes it isn't possible to express a delta as operations. In this case,
// changeType will be ChangeType.Model, and a full post-merge model will be supplied.
// A CRDT Change is parameterized by the operations that can be represented, and the data representation
// of the model.
export enum ChangeType {Operations, Model}
export type CRDTChange<T extends CRDTTypeRecord> = {changeType: ChangeType.Operations, operations: T['operation'][]} | {changeType: ChangeType.Model, modelPostChange: T['data']};

export function isEmptyChange<T extends CRDTTypeRecord>(change: CRDTChange<T>): boolean {
  return change.changeType === ChangeType.Operations && change.operations.length === 0;
}

export function createEmptyChange<T extends CRDTTypeRecord>(): CRDTChange<T> {
  return {changeType: ChangeType.Operations, operations: []};
}
