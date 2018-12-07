/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {assert} from './chai-web.js';

import {Schema} from '../schema.js';
import {EntityType, TypeVariable, SlotType} from '../type.js';
import {SlotInfo} from '../slot-info.js';
import {TypeChecker} from '../recipe/type-checker.js';
import {TypeVariableInfo} from '../type-variable-info.js';
import {Manifest} from '../manifest.js';
import {Handle} from '../recipe/handle.js';


describe('TypeChecker', () => {
  it('resolves a trio of in [~a], out [~b], in [Product]', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const b = new TypeVariable(new TypeVariableInfo('b')).collectionOf();
    const c = new EntityType(new Schema({names: ['Product'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.resolvedType().collectionType.canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.resolvedType().collectionType.canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Product');
  });

  it(`doesn't resolve a pair of inout [~a], inout ~a`, async () => {
    const variable = new TypeVariable(new TypeVariableInfo('a'));
    const collection = variable.collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: variable, direction: 'inout'}, {type: collection, direction: 'inout'}]);
    assert.isNull(result);
  });

  it('resolves a trio of in BigCollection<~a>, out BigCollection<~b>, in BigCollection<Product>', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const b = new TypeVariable(new TypeVariableInfo('b')).bigCollectionOf();
    const c = new EntityType(new Schema({names: ['Product'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.resolvedType().bigCollectionType.canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.resolvedType().bigCollectionType.canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Product');
  });

  it('resolves a trio of in [Thing], in [Thing], out [Product]', async () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}})).collectionOf();
    const b = new EntityType(new Schema({names: ['Thing'], fields: {}})).collectionOf();
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in BigCollection<Thing>, in BigCollection<Thing>, out BigCollection<Product>', async () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}})).bigCollectionOf();
    const b = new EntityType(new Schema({names: ['Thing'], fields: {}})).bigCollectionOf();
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of out [Product], in [Thing], in [Thing]', async () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}})).collectionOf();
    const b = new EntityType(new Schema({names: ['Thing'], fields: {}})).collectionOf();
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of out BigCollection<Product>, in BigCollection<Thing>, in BigCollection<Thing>', async () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}})).bigCollectionOf();
    const b = new EntityType(new Schema({names: ['Thing'], fields: {}})).bigCollectionOf();
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in [~a] (is Thing), in [~b] (is Thing), out [Product]', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const b = new TypeVariable(new TypeVariableInfo('b')).collectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.collectionType.variable.resolution = resolution;
    b.collectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in BigCollection<~a> (is Thing), in BigCollection<~b> (is Thing), out BigCollection<Product>', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const b = new TypeVariable(new TypeVariableInfo('b')).bigCollectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.bigCollectionType.variable.resolution = resolution;
    b.bigCollectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a pair of in [~a] (is Thing), out [Product]', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.collectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.include(result.collectionType.canReadSubset.entitySchema.names, 'Thing');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a pair of in BigCollection<~a> (is Thing), out BigCollection<Product>', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.bigCollectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.include(result.bigCollectionType.canReadSubset.entitySchema.names, 'Thing');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], in [Product]`, async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.collectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, in BigCollection<Product>`, async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.bigCollectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], inout [Product]`, async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.collectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, inout BigCollection<Product>]`, async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.bigCollectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.isNull(result);
  });

  it('resolves inout [~a] (is Thing), in [~b] (is Thing), in [Product], in [~c], in [~d] (is Product)', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const b = new TypeVariable(new TypeVariableInfo('b')).collectionOf();
    let resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.collectionType.variable.resolution = resolution;
    b.collectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf();
    const d = new TypeVariable(new TypeVariableInfo('c')).collectionOf();
    const e = new TypeVariable(new TypeVariableInfo('d')).collectionOf();
    resolution = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}}));
    e.collectionType.variable.resolution = resolution;
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.isNull(result);
  });

  it('resolves inout BigCollection<~a> (is Thing), in BC<~b> (is Thing), in BC<Product>, in BC<~c>, in BC<~d> (is Product)', async () => {
    const a = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const b = new TypeVariable(new TypeVariableInfo('b')).bigCollectionOf();
    let resolution = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    a.bigCollectionType.variable.resolution = resolution;
    b.bigCollectionType.variable.resolution = resolution;
    const c = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf();
    const d = new TypeVariable(new TypeVariableInfo('c')).bigCollectionOf();
    const e = new TypeVariable(new TypeVariableInfo('d')).bigCollectionOf();
    resolution = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}}));
    e.bigCollectionType.variable.resolution = resolution;
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't depend on ordering in assigning a resolution to a type variable`, async () => {
    let a = new TypeVariable(new TypeVariableInfo('a'));
    const b = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}}));
    const c = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');

    a = new TypeVariable(new TypeVariableInfo('a'));
    result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'in'}, {type: b, direction: 'out'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('correctly applies then resolves a one-sided Entity constraint', async () => {
    const manifest = await Manifest.parse(`
      shape Shape
        in ~a item

      particle Concrete
        in Product {} item

      particle Transformation
        host Shape particle0
        in [~a] collection

      recipe
        create as h0
        Transformation
          particle0 <- Concrete
          collection <- h0
    `);

    const recipe = manifest.recipes[0];
    const type = Handle.effectiveType(null, recipe.handles[0].connections);
    assert.equal(false, type.isResolved());
    assert.equal(true, type.canEnsureResolved());
    assert.equal(true, type.maybeEnsureResolved());
    assert.equal(true, type.isResolved());
    assert.equal('Product', type.resolvedType().collectionType.entitySchema.names[0]);

    recipe.normalize();
    assert.equal(true, recipe.isResolved());

  });

  it(`doesn't resolve Entity and Collection`, async () => {
    const entity = {
      type: new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})),
      direction: 'inout'
    };
    const collection = {
      type: new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(collection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, entity]));
  });

  it(`doesn't resolve Entity and BigCollection`, async () => {
    const entity = {
      type: new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})),
      direction: 'inout'
    };
    const bigCollection = {
      type: new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, entity]));
  });

  it(`doesn't resolve Collection and BigCollection`, async () => {
    const collection = {
      type: new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).collectionOf(),
      direction: 'inout'
    };
    const bigCollection = {
      type: new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}})).bigCollectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(collection.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, collection]));
  });

  it(`doesn't resolve Entity and Collection of type variable`, () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    const b = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'inout'}]));
  });

  it(`doesn't resolve Entity and BigCollection of type variable`, () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}}));
    const b = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'inout'}]));
  });

  it(`doesn't resolve Collection and BigCollection of type variable`, () => {
    const a = new EntityType(new Schema({names: ['Thing'], fields: {}})).collectionOf();
    const b = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'inout'}]));
  });

  it(`doesn't modify an input baseType if invoked through Handle.effectiveType`, async () => {
    const baseType = new TypeVariable(new TypeVariableInfo('a'));
    const connection = {
      type: new EntityType(new Schema({names: ['Thing'], fields: {}})),
      direction: 'inout'
    };

    const newType = Handle.effectiveType(baseType, [connection]);
    assert.notStrictEqual(baseType, newType);
    assert.isNull(baseType.variable.resolution);
    assert.isNotNull(newType.variable.resolution);
  });

  it('can compare a type variable with a Collection handle', async () => {
    const leftType = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const rightType = new TypeVariable(new TypeVariableInfo('b'));
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a BigCollection handle', async () => {
    const leftType = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const rightType = new TypeVariable(new TypeVariableInfo('b'));
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a Collection handle (with constraints)', async () => {
    const canWrite = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}}));
    const leftType = new TypeVariable(new TypeVariableInfo('a')).collectionOf();
    const rightType = new TypeVariable(new TypeVariableInfo('b', canWrite));
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a Collection handle (with constraints)', async () => {
    const canWrite = new EntityType(new Schema({names: ['Product', 'Thing'], fields: {}}));
    const leftType = new TypeVariable(new TypeVariableInfo('a')).bigCollectionOf();
    const rightType = new TypeVariable(new TypeVariableInfo('b', canWrite));
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it(`doesn't mutate types provided to effectiveType calls`, () => {
    const a = new TypeVariable(new TypeVariableInfo('a'));
    assert.isNull(a.variable._resolution);
    Handle.effectiveType(undefined, [{type: a, direction: 'inout'}]);
    assert.isNull(a.variable._resolution);
  });

  it('resolves a single Slot type', () => {
    const a = new SlotType(new SlotInfo({}));
    const result = TypeChecker.processTypeList(null, [{type: a, direction: '`consume'}]);
    assert(result.canEnsureResolved());
    result.maybeEnsureResolved();
    assert(result.isResolved());
    assert(result.resolvedType() instanceof SlotType);
  });
});
