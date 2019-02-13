// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/chai-web.js';
import {InterfaceInfo} from '../interface-info.js';
import {Manifest} from '../manifest.js';
import {Schema} from '../schema.js';
import {SlotInfo} from '../slot-info.js';
import {TypeVariableInfo} from '../type-variable-info.js';
import {ArcType, BigCollectionType, CollectionType, EntityType, HandleType, InterfaceType,
        ReferenceType, RelationType, SlotType, Type, TypeVariable} from '../type.js';

// For reference, this is a list of all the types and their contained data:
//   EntityType        : Schema
//   TypeVariable      : TypeVariableInfo
//   CollectionType    : Type
//   BigCollectionType : Type
//   RelationType      : [Type]
//   InterfaceType     : InterfaceInfo
//   SlotType          : SlotInfo
//   ReferenceType     : Type
//   ArcType           : none
//   HandleType        : none

describe('types', () => {
  describe('literals and cloning', () => {
    // Ignore undefined fields.
    function deepEqual(a, b) {
      assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    }

    it('Entity', async () => {
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      deepEqual(entity.toLiteral(), {
        tag: 'Entity',
        data: {names: ['Foo'], fields: {value: 'Text'}, description: {}}
      });
      deepEqual(entity, Type.fromLiteral(entity.toLiteral()));
      deepEqual(entity, entity.clone(new Map()));
    });

    it('TypeVariable', async () => {
      const variable = TypeVariable.make('a', null, null);
      deepEqual(variable.toLiteral(), {
        tag: 'TypeVariable',
        data: {name: 'a', canWriteSuperset: null, canReadSubset: null}
      });
      deepEqual(variable, Type.fromLiteral(variable.toLiteral()));
      deepEqual(variable, variable.clone(new Map()));
    });

    it('Collection', async () => {
      // Collection of entities
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const col1   = new CollectionType(entity);
      deepEqual(col1.toLiteral(), {tag: 'Collection', data: entity.toLiteral()});
      deepEqual(col1, Type.fromLiteral(col1.toLiteral()));
      deepEqual(col1, col1.clone(new Map()));

      // Collection of collection of variables
      const variable = TypeVariable.make('a', null, null);
      const inner    = new CollectionType(variable);
      const col2     = new CollectionType(inner);
      deepEqual(col2.toLiteral(), {
        tag: 'Collection',
        data: {tag: 'Collection', data: variable.toLiteral()}
      });
      deepEqual(col2, Type.fromLiteral(col2.toLiteral()));
      deepEqual(col2, col2.clone(new Map()));

      // Collection of references to slots
      const slot      = SlotType.make('f', 'h');
      const reference = new ReferenceType(slot);
      const col3      = new CollectionType(reference);
      deepEqual(col3.toLiteral(), {tag: 'Collection', data: reference.toLiteral()});
      deepEqual(col3, Type.fromLiteral(col3.toLiteral()));
      deepEqual(col3, col3.clone(new Map()));
    });

    it('BigCollection', async () => {
      // BigCollection of entities
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const big1   = new BigCollectionType(entity);
      deepEqual(big1.toLiteral(), {tag: 'BigCollection', data: entity.toLiteral()});
      deepEqual(big1, Type.fromLiteral(big1.toLiteral()));
      deepEqual(big1, big1.clone(new Map()));

      // BigCollection of BigCollection of variables
      const variable = TypeVariable.make('a', null, null);
      const inner    = new BigCollectionType(variable);
      const big2     = new BigCollectionType(inner);
      deepEqual(big2.toLiteral(), {
        tag: 'BigCollection',
        data: {tag: 'BigCollection', data: variable.toLiteral()}
      });
      deepEqual(big2, Type.fromLiteral(big2.toLiteral()));
      deepEqual(big2, big2.clone(new Map()));

      // BigCollection of references to slots
      const slot      = SlotType.make('f', 'h');
      const reference = new ReferenceType(slot);
      const big3      = new BigCollectionType(reference);
      deepEqual(big3.toLiteral(), {tag: 'BigCollection', data: reference.toLiteral()});
      deepEqual(big3, Type.fromLiteral(big3.toLiteral()));
      deepEqual(big3, big3.clone(new Map()));
    });

    it('Relation', async () => {
      const entity   = EntityType.make(['Foo'], {value: 'Text'});
      const variable = TypeVariable.make('a', null, null);
      const col      = new CollectionType(entity);
      const relation = new RelationType([entity, variable, col]);
      deepEqual(relation.toLiteral(), {
        tag: 'Relation',
        data: [entity.toLiteral(), variable.toLiteral(), col.toLiteral()]
      });
      deepEqual(relation, Type.fromLiteral(relation.toLiteral()));
      deepEqual(relation, relation.clone(new Map()));
    });

    it('Interface', async () => {
      const entity   = EntityType.make(['Foo'], {value: 'Text'});
      const variable = TypeVariable.make('a', null, null);
      const col      = new CollectionType(entity);
      const iface    = InterfaceType.make('i', [{type: entity}, {type: variable}, {type: col}], [{name: 'x'}]);
      deepEqual(iface.toLiteral(), {
        tag: 'Interface',
        data: {
          name: 'i',
          handles: [{type: entity.toLiteral()}, {type: variable.toLiteral()}, {type: col.toLiteral()}],
          slots: [{name: 'x'}]
        }
      });
      deepEqual(iface, Type.fromLiteral(iface.toLiteral()));
      deepEqual(iface, iface.clone(new Map()));
    });
    
    it('Slot', async () => {
      const slot = SlotType.make('f', 'h');
      deepEqual(slot.toLiteral(), {tag: 'Slot', data: {formFactor: 'f', handle: 'h'}});
      deepEqual(slot, Type.fromLiteral(slot.toLiteral()));
      deepEqual(slot, slot.clone(new Map()));
    });

    it('Reference', async () => {
      // Reference to entity
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const ref1   = new ReferenceType(entity);
      deepEqual(ref1.toLiteral(), {tag: 'Reference', data: entity.toLiteral()});
      deepEqual(ref1, Type.fromLiteral(ref1.toLiteral()));
      deepEqual(ref1, ref1.clone(new Map()));

      // Reference to reference variable
      const variable = TypeVariable.make('a', null, null);
      const inner    = new ReferenceType(variable);
      const ref2     = new ReferenceType(inner);
      deepEqual(ref2.toLiteral(), {
        tag: 'Reference',
        data: {tag: 'Reference', data: variable.toLiteral()}
      });
      deepEqual(ref2, Type.fromLiteral(ref2.toLiteral()));
      deepEqual(ref2, ref2.clone(new Map()));

      // Reference to collection of slots
      const slot = SlotType.make('f', 'h');
      const col = new CollectionType(slot);
      const ref3 = new ReferenceType(col);
      deepEqual(ref3.toLiteral(), {tag: 'Reference', data: col.toLiteral()});
      deepEqual(ref3, Type.fromLiteral(ref3.toLiteral()));
      deepEqual(ref3, ref3.clone(new Map()));
    });

    it('ArcInfo', async () => {
      const arcInfo = new ArcType();
      deepEqual(arcInfo.toLiteral(), {tag: 'Arc'});
      deepEqual(arcInfo, Type.fromLiteral(arcInfo.toLiteral()));
      deepEqual(arcInfo, arcInfo.clone(new Map()));
    });

    it('HandleInfo', async () => {
      const handleInfo = new HandleType();
      deepEqual(handleInfo.toLiteral(), {tag: 'Handle'});
      deepEqual(handleInfo, Type.fromLiteral(handleInfo.toLiteral()));
      deepEqual(handleInfo, handleInfo.clone(new Map()));
    });

    it('combine all the types', async () => {
      const slot       = SlotType.make('f', 'h');
      const bigCol     = new BigCollectionType(slot);
      const reference  = new ReferenceType(bigCol);

      const entity     = EntityType.make(['Foo'], {value: 'Text'});
      const variable   = TypeVariable.make('a', null, null);
      const arcInfo    = new ArcType();
      const iface      = InterfaceType.make('i', [{type: entity}, {type: variable}, {type: arcInfo}], []);

      const handleInfo = new HandleType();

      const relation   = new RelationType([reference, iface, handleInfo]);
      const collection = new CollectionType(relation);

      deepEqual(collection, Type.fromLiteral(collection.toLiteral()));
      deepEqual(collection, collection.clone(new Map()));
    });
  });

  describe('TypeVariable', () => {
    const resolutionAssertMsg = 'variable cannot resolve to collection of itself';

    it(`setting the resolution to itself is a no-op`, () => {
      const a = TypeVariable.make('x');
      a.variable.resolution = a;
      assert.isNull(a.variable.resolution);
    });

    it(`allows 2 type variables to resolve to each other`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      a.variable.resolution = b;
      b.variable.resolution = a;

      assert.strictEqual(a.resolvedType(), b.resolvedType());
    });

    it(`allows the resolution to be a Collection of other type variable`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      a.variable.resolution = b.collectionOf();
    });

    it(`allows the resolution to be a BigCollection of other type variable`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      a.variable.resolution = b.bigCollectionOf();
    });

    it(`disallows the resolution to be a Collection of itself`, () => {
      const a = TypeVariable.make('x');
      assert.throws(() => a.variable.resolution = a.collectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution to be a BigCollection of itself`, () => {
      const a = TypeVariable.make('x');
      assert.throws(() => a.variable.resolution = a.bigCollectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a Collection of type variable that resolve to x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a;
      assert.throws(() => a.variable.resolution = b.collectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a BigCollection of type variable that resolve to x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a;
      assert.throws(() => a.variable.resolution = b.bigCollectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a type variable that resolves to Collection of x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a.collectionOf();
      assert.throws(() => a.variable.resolution = b, resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a type variable that resolves to BigCollection of x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a.bigCollectionOf();
      assert.throws(() => a.variable.resolution = b, resolutionAssertMsg);
    });

    it(`maybeEnsureResolved clears canReadSubset and canWriteSuperset`, () => {
      const a = new TypeVariableInfo('x');
      const b = EntityType.make(['Thing'], {});

      a.maybeMergeCanWriteSuperset(b);

      assert.equal(a.canWriteSuperset, b);
      assert.notExists(a.canReadSubset);
      assert.notExists(a.resolution);

      a.maybeEnsureResolved();

      assert.notExists(a.canWriteSuperset);
      assert.notExists(a.canReadSubset);
      assert.equal(a.resolution, b);
    });
  });

  describe('integration', () => {
    const manifestText = `
      schema Product
        Text name

      schema Lego extends Product
        Text setID

      particle WritesLego
        out [Lego] lego

      particle ReadsProduct
        in [Product] product

      recipe MatchBasic
        create as v0
        WritesLego
          lego -> v0
        ReadsProduct
          product <- v0

      recipe MatchExisting
        use 'test:1' as v0
        WritesLego
          lego -> v0
        ReadsProduct
          product <- v0`;

    it('a subtype matches to a supertype that wants to be read', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[0];
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.equal(recipe.handles.length, 1);
      assert.equal(recipe.handles[0].type.primitiveType().canReadSubset.entitySchema.name, 'Lego');
      assert.equal(recipe.handles[0].type.primitiveType().canWriteSuperset.entitySchema.name, 'Product');
    });

    it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[1];
      recipe.handles[0].mapToStorage({
        id: 'test1',
        type: manifest.findSchemaByName('Product').entityClass().type.collectionOf()
      });
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.lengthOf(recipe.handles, 1);
      assert.equal(recipe.handles[0].type.primitiveType().entitySchema.name, 'Product');
    });

    it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[1];
      recipe.handles[0].mapToStorage({
        id: 'test1',
        type: manifest.findSchemaByName('Lego').entityClass().type.collectionOf()
      });
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.lengthOf(recipe.handles, 1);
      assert.equal(recipe.handles[0].type.primitiveType().entitySchema.name, 'Lego');
    });
  });
});
