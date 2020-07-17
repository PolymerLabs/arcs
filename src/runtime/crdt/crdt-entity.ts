/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ChangeType, CRDTChange, CRDTModel, CRDTTypeRecord, VersionMap} from './crdt.js';
import {Referenceable, CRDTCollectionTypeRecord, CRDTCollection, CollectionOpTypes} from './crdt-collection.js';
import {CRDTSingletonTypeRecord, CRDTSingleton, SingletonOpTypes} from './crdt-singleton.js';
import {Dictionary} from '../hot.js';

// Identified extends the concept of Referenceable to a Dictionary
export type Identified = Dictionary<Referenceable>;

// All Entity CRDT types are based around a dictionary of singleton fields and a dictionary of collection fields.
// The CRDT is composed of CRDTSingleton and CRDTCollection objects, one for each field.
// The raw view contains the single value from each CRDTSingleton (or null) and a set of the values from each
// CRDTCollection.
export type RawEntity<S extends Identified, C extends Identified> =
{
  singletons: S,
  collections: {[P in keyof C]: Set<C[P]>}
};

// These extend singleton/collection "data" views across an entity structure.
type SingletonEntityData<S extends Identified> = {[P in keyof S]: CRDTSingletonTypeRecord<S[P]>['data']};
type CollectionEntityData<S extends Identified> = {[P in keyof S]: CRDTCollectionTypeRecord<S[P]>['data']};

// These extend actual CRDT objects across an entity structure.
export type SingletonEntityModel<S extends Identified> = {[P in keyof S]: CRDTSingleton<S[P]>};
export type CollectionEntityModel<S extends Identified> = {[P in keyof S]: CRDTCollection<S[P]>};

// The data view of an entity.
export type EntityData<S extends Identified, C extends Identified> =
  {
    singletons: SingletonEntityData<S>,
    collections: CollectionEntityData<C>,
    version: VersionMap
  };

// The internal model of an entity.
export type EntityInternalModel<S extends Identified, C extends Identified> =
  {
    singletons: SingletonEntityModel<S>,
    collections: CollectionEntityModel<C>,
    version: VersionMap
  };

export enum EntityOpTypes {Set, Clear, Add, Remove, ClearAll}

type SetOp<Singleton, Field extends keyof Singleton> = {type: EntityOpTypes.Set, field: Field, value: Singleton[Field], actor: string, clock: VersionMap};
type AddOp<Collection, Field extends keyof Collection> = {type: EntityOpTypes.Add, field: Field, added: Collection[Field], actor: string, clock: VersionMap};
type RemoveOp<Collection, Field extends keyof Collection> = {type: EntityOpTypes.Remove, field: Field, removed: Collection[Field], actor: string, clock: VersionMap};
type ClearAllOp = {type: EntityOpTypes.ClearAll, actor: string, clock: VersionMap};

export type EntityOperation<S, C> =
  SetOp<S, keyof S> |
  {type: EntityOpTypes.Clear, field: keyof S, actor: string, clock: VersionMap} |
  AddOp<C, keyof C> |
  RemoveOp<C, keyof C> |
  ClearAllOp;

export interface CRDTEntityTypeRecord<S extends Identified, C extends Identified> extends CRDTTypeRecord {
  data: EntityData<S, C>;
  operation: EntityOperation<S, C>;
  consumerType: RawEntity<S, C>;
}

type EntityModel<S extends Identified, C extends Identified> = CRDTModel<CRDTEntityTypeRecord<S, C>>;
type EntityChange<S extends Identified, C extends Identified> = CRDTChange<CRDTEntityTypeRecord<S, C>>;

export class CRDTEntity<S extends Identified, C extends Identified> implements EntityModel<S, C> {
  // Note that this should really be private, but it can't be because subclasses need to be
  // automatically constructed (which means constructed in a function) and anonymous subclasses
  // can't be returned from a function if they have private or protected members because of
  // TS4094 (see e.g. https://github.com/Microsoft/TypeScript/issues/30355 for Microsoft's take on the issue)
  model: EntityInternalModel<S, C>;

  constructor(singletons: SingletonEntityModel<S>, collections: CollectionEntityModel<C>) {
    this.model = {singletons, collections, version: {}};
  }

  merge(other: EntityData<S, C>): {modelChange: EntityChange<S, C>, otherChange: EntityChange<S, C>} {
    const singletonChanges = {};
    const collectionChanges = {};
    let allOps = true;
    for (const singleton of Object.keys(this.model.singletons)) {
      singletonChanges[singleton] = this.model.singletons[singleton].merge(other.singletons[singleton]);
      if (singletonChanges[singleton].modelChange.changeType === ChangeType.Model ||
          singletonChanges[singleton].otherChange.changeType === ChangeType.Model) {
        allOps = false;
      }
    }
    for (const collection of Object.keys(this.model.collections)) {
      collectionChanges[collection] = this.model.collections[collection].merge(other.collections[collection]);
      if (collectionChanges[collection].modelChange.changeType === ChangeType.Model ||
          collectionChanges[collection].otherChange.changeType === ChangeType.Model) {
        allOps = false;
      }
    }
    for (const versionKey of Object.keys(other.version)) {
      this.model.version[versionKey] = Math.max(this.model.version[versionKey] || 0, other.version[versionKey]);
    }
    if (allOps) {
      const modelOps = [];
      const otherOps = [];
      for (const singleton of Object.keys(singletonChanges)) {
        for (const operation of singletonChanges[singleton].modelChange.operations) {
          let op: EntityOperation<S, C>;
          if (operation.type as SingletonOpTypes === SingletonOpTypes.Set) {
            op = {...operation, type: EntityOpTypes.Set, field: singleton};
          } else {
            op = {...operation, type: EntityOpTypes.Clear, field: singleton};
          }
          modelOps.push(op);
        }
        for (const operation of singletonChanges[singleton].otherChange.operations) {
          let op: EntityOperation<S, C>;
          if (operation.type as SingletonOpTypes === SingletonOpTypes.Set) {
            op = {...operation, type: EntityOpTypes.Set, field: singleton};
          } else {
            op = {...operation, type: EntityOpTypes.Clear, field: singleton};
          }
          otherOps.push(op);
        }
      }
      for (const collection of Object.keys(collectionChanges)) {
        for (const operation of collectionChanges[collection].modelChange.operations) {
          let op: EntityOperation<S, C>;
          if (operation.type as CollectionOpTypes === CollectionOpTypes.Add) {
            op = {...operation, type: EntityOpTypes.Add, field: collection};
          } else {
            op = {...operation, type: EntityOpTypes.Remove, field: collection};
          }
          modelOps.push(op);
        }
        for (const operation of collectionChanges[collection].otherChange.operations) {
          let op: EntityOperation<S, C>;
          if (operation.type as CollectionOpTypes === CollectionOpTypes.Add) {
            op = {...operation, type: EntityOpTypes.Add, field: collection};
          } else {
            op = {...operation, type: EntityOpTypes.Remove, field: collection};
          }
          otherOps.push(op);
        }
      }
      return {modelChange: {changeType: ChangeType.Operations, operations: modelOps},
              otherChange: {changeType: ChangeType.Operations, operations: otherOps}};
    } else {
      // need to map this.model to get the data out.

      const change: EntityChange<S, C> = {changeType: ChangeType.Model, modelPostChange: this.getData()};
      return {modelChange: change, otherChange: change};
    }
  }

  applyOperation(op: EntityOperation<S, C>): boolean {
    if (op.type === EntityOpTypes.Set || op.type === EntityOpTypes.Clear) {
      if (!this.model.singletons[op.field]) {
        if (this.model.collections[op.field as keyof C]) {
          throw new Error(`Can't apply ${op.type === EntityOpTypes.Set ? 'Set' : 'Clear'} operation to collection field ${op.field}`);
        }
        throw new Error(`Invalid field: ${op.field} does not exist`);
      }
    } else if (op.type === EntityOpTypes.Add || op.type === EntityOpTypes.Remove) {
      if (!this.model.collections[op.field]) {
        if (this.model.singletons[op.field as keyof S]) {
          throw new Error(`Can't apply ${op.type === EntityOpTypes.Add ? 'Add' : 'Remove'} operation to singleton field ${op.field}`);
        }
        throw new Error(`Invalid field: ${op.field} does not exist`);
      }
    }

    const apply = () => {
      switch (op.type) {
        case EntityOpTypes.Set:
          return this.model.singletons[op.field].applyOperation({...op, type: SingletonOpTypes.Set});
        case EntityOpTypes.Clear:
          return this.model.singletons[op.field].applyOperation({...op, type: SingletonOpTypes.Clear});
        case EntityOpTypes.Add:
          return this.model.collections[op.field].applyOperation({...op, type: CollectionOpTypes.Add});
        case EntityOpTypes.Remove:
          return this.model.collections[op.field].applyOperation({...op, type: CollectionOpTypes.Remove});
        case EntityOpTypes.ClearAll:
          return this.clear(op.actor);
        default:
          throw new Error(`Unexpected op ${op} for Entity CRDT`);
      }
    };
    if (apply()) {
      for (const versionKey of Object.keys(op.clock)) {
        this.model.version[versionKey] = Math.max(this.model.version[versionKey] || 0, op.clock[versionKey]);
      }
      return true;
    }
    return false;
  }

  // Clear all fields.
  clear(actor: string): boolean {
    Object.values(this.model.singletons).forEach(field =>
      field.applyOperation({
        type: SingletonOpTypes.Clear,
        actor,
        clock: this.model.version,
    }));

    Object.values(this.model.collections).forEach(field =>
      field.getParticleView().forEach(value =>
        field.applyOperation({
          type: CollectionOpTypes.Remove,
          removed: value,
          actor,
          clock: this.model.version,
        })));
    return true;
  }

  getData(): EntityData<S, C> {
    const singletons = {};
    const collections = {};
    Object.keys(this.model.singletons).forEach(singleton => {
      singletons[singleton] = this.model.singletons[singleton].getData();
    });
    Object.keys(this.model.collections).forEach(collection => {
      collections[collection] = this.model.collections[collection].getData();
    });
    return {singletons, collections, version: this.model.version} as EntityData<S, C>;
  }

  getParticleView(): RawEntity<S, C> {
    const result = {singletons: {}, collections: {}};
    for (const key of Object.keys(this.model.singletons)) {
      result.singletons[key] = this.model.singletons[key].getParticleView();
    }
    for (const key of Object.keys(this.model.collections)) {
      result.collections[key] = this.model.collections[key].getParticleView();
    }
    return result as RawEntity<S, C>;
  }
}
