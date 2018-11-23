// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from './chai-web.js';
import {Type} from '../ts-build/type.js';
import {Schema} from '../ts-build/schema.js';
import {TypeVariable} from '../ts-build/type-variable.js';
import {Shape} from '../ts-build/shape.js';
import {SlotInfo} from '../ts-build/slot-info.js';

// This is only testing to/fromLiteral and clone at the moment.
//
// For reference, this is a list of all the types and their contained data:
//   EntityType        : Schema
//   VariableType      : TypeVariable
//   CollectionType    : Type
//   BigCollectionType : Type
//   RelationType      : [Type]
//   InterfaceType     : Shape
//   SlotType          : SlotInfo
//   ReferenceType     : Type
//   ArcInfoType       : none
//   HandleInfoType    : none

describe('Types', function() {
  // Ignore undefined fields.
  function deepEqual(a, b) {
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  }

  it('Entity', async () => {
    const entity = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    deepEqual(entity.toLiteral(), {
      tag: 'Entity',
      data: {names: ['Foo'], fields: {value: 'Text'}, description: {}}
    });
    deepEqual(entity, Type.fromLiteral(entity.toLiteral()));
    deepEqual(entity, entity.clone(new Map()));
  });

  it('Variable', async () => {
    const variable = Type.newVariable(new TypeVariable('a', null, null));
    deepEqual(variable.toLiteral(), {
      tag: 'Variable',
      data: {name: 'a', canWriteSuperset: null, canReadSubset: null}
    });
    deepEqual(variable, Type.fromLiteral(variable.toLiteral()));
    deepEqual(variable, variable.clone(new Map()));
  });

  it('Collection', async () => {
    // Collection of entities
    const entity = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    const col1   = Type.newCollection(entity);
    deepEqual(col1.toLiteral(), {tag: 'Collection', data: entity.toLiteral()});
    deepEqual(col1, Type.fromLiteral(col1.toLiteral()));
    deepEqual(col1, col1.clone(new Map()));

    // Collection of collection of variables
    const variable = Type.newVariable(new TypeVariable('a', null, null));
    const inner    = Type.newCollection(variable);
    const col2     = Type.newCollection(inner);
    deepEqual(col2.toLiteral(), {
      tag: 'Collection',
      data: {tag: 'Collection', data: variable.toLiteral()}
    });
    deepEqual(col2, Type.fromLiteral(col2.toLiteral()));
    deepEqual(col2, col2.clone(new Map()));

    // Collection of references to slots
    const slot      = Type.newSlot(new SlotInfo({formFactor: 'f', handle: 'h'}));
    const reference = Type.newReference(slot);
    const col3      = Type.newCollection(reference);
    deepEqual(col3.toLiteral(), {tag: 'Collection', data: reference.toLiteral()});
    deepEqual(col3, Type.fromLiteral(col3.toLiteral()));
    deepEqual(col3, col3.clone(new Map()));
  });

  it('BigCollection', async () => {
    // BigCollection of entities
    const entity = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    const big1   = Type.newBigCollection(entity);
    deepEqual(big1.toLiteral(), {tag: 'BigCollection', data: entity.toLiteral()});
    deepEqual(big1, Type.fromLiteral(big1.toLiteral()));
    deepEqual(big1, big1.clone(new Map()));

    // BigCollection of BigCollection of variables
    const variable = Type.newVariable(new TypeVariable('a', null, null));
    const inner    = Type.newBigCollection(variable);
    const big2     = Type.newBigCollection(inner);
    deepEqual(big2.toLiteral(), {
      tag: 'BigCollection',
      data: {tag: 'BigCollection', data: variable.toLiteral()}
    });
    deepEqual(big2, Type.fromLiteral(big2.toLiteral()));
    deepEqual(big2, big2.clone(new Map()));

    // BigCollection of references to slots
    const slot      = Type.newSlot(new SlotInfo({formFactor: 'f', handle: 'h'}));
    const reference = Type.newReference(slot);
    const big3      = Type.newBigCollection(reference);
    deepEqual(big3.toLiteral(), {tag: 'BigCollection', data: reference.toLiteral()});
    deepEqual(big3, Type.fromLiteral(big3.toLiteral()));
    deepEqual(big3, big3.clone(new Map()));
  });

  it('Relation', async () => {
    const entity   = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    const variable = Type.newVariable(new TypeVariable('a', null, null));
    const col      = Type.newCollection(entity);
    const relation = Type.newRelation([entity, variable, col]);
    deepEqual(relation.toLiteral(), {
      tag: 'Relation',
      data: [entity.toLiteral(), variable.toLiteral(), col.toLiteral()]
    });
    deepEqual(relation, Type.fromLiteral(relation.toLiteral()));
    deepEqual(relation, relation.clone(new Map()));
  });

  it('Interface', async () => {
    const entity   = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    const variable = Type.newVariable(new TypeVariable('a', null, null));
    const col      = Type.newCollection(entity);
    const iface    = Type.newInterface(
        new Shape('s', [{type: entity}, {type: variable}, {type: col}], [{name: 'x'}]));
    deepEqual(iface.toLiteral(), {
      tag: 'Interface',
      data: {
        name: 's',
        handles: [{type: entity.toLiteral()}, {type: variable.toLiteral()}, {type: col.toLiteral()}],
        slots: [{name: 'x'}]
      }
    });
    deepEqual(iface, Type.fromLiteral(iface.toLiteral()));
    deepEqual(iface, iface.clone(new Map()));
  });
  
  it('Slot', async () => {
    const slot = Type.newSlot(new SlotInfo({formFactor: 'f', handle: 'h'}));
    deepEqual(slot.toLiteral(), {tag: 'Slot', data: {formFactor: 'f', handle: 'h'}});
    deepEqual(slot, Type.fromLiteral(slot.toLiteral()));
    deepEqual(slot, slot.clone(new Map()));
  });

  it('Reference', async () => {
    // Reference to entity
    const entity = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    const ref1   = Type.newReference(entity);
    deepEqual(ref1.toLiteral(), {tag: 'Reference', data: entity.toLiteral()});
    deepEqual(ref1, Type.fromLiteral(ref1.toLiteral()));
    deepEqual(ref1, ref1.clone(new Map()));

    // Reference to reference variable
    const variable = Type.newVariable(new TypeVariable('a', null, null));
    const inner    = Type.newReference(variable);
    const ref2     = Type.newReference(inner);
    deepEqual(ref2.toLiteral(), {
      tag: 'Reference',
      data: {tag: 'Reference', data: variable.toLiteral()}
    });
    deepEqual(ref2, Type.fromLiteral(ref2.toLiteral()));
    deepEqual(ref2, ref2.clone(new Map()));

    // Reference to collection of slots
    const slot = Type.newSlot(new SlotInfo({formFactor: 'f', handle: 'h'}));
    const col = Type.newCollection(slot);
    const ref3 = Type.newReference(col);
    deepEqual(ref3.toLiteral(), {tag: 'Reference', data: col.toLiteral()});
    deepEqual(ref3, Type.fromLiteral(ref3.toLiteral()));
    deepEqual(ref3, ref3.clone(new Map()));
  });

  it('ArcInfo', async () => {
    const arcInfo = Type.newArcInfo();
    deepEqual(arcInfo.toLiteral(), {tag: 'ArcInfo'});
    deepEqual(arcInfo, Type.fromLiteral(arcInfo.toLiteral()));
    deepEqual(arcInfo, arcInfo.clone(new Map()));
  });

  it('HandleInfo', async () => {
    const handleInfo = Type.newHandleInfo();
    deepEqual(handleInfo.toLiteral(), {tag: 'HandleInfo'});
    deepEqual(handleInfo, Type.fromLiteral(handleInfo.toLiteral()));
    deepEqual(handleInfo, handleInfo.clone(new Map()));
  });

  it('combine all the types', async () => {
    const slot       = Type.newSlot(new SlotInfo({formFactor: 'f', handle: 'h'}));
    const bigCol     = Type.newBigCollection(slot);
    const reference  = Type.newReference(bigCol);

    const entity     = Type.newEntity(new Schema({names: ['Foo'], fields: {value: 'Text'}}));
    const variable   = Type.newVariable(new TypeVariable('a', null, null));
    const arcInfo    = Type.newArcInfo();
    const iface      = Type.newInterface(new Shape('s', [{type: entity}, {type: variable}, {type: arcInfo}], []));

    const handleInfo = Type.newHandleInfo();

    const relation   = Type.newRelation([reference, iface, handleInfo]);
    const collection = Type.newCollection(relation);

    deepEqual(collection, Type.fromLiteral(collection.toLiteral()));
    deepEqual(collection, collection.clone(new Map()));
  });
});
