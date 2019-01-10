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
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    const c = EntityType.make(['Product'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    const canWriteSuperset = a.resolvedType().collectionType.canWriteSuperset as EntityType;

    assert.instanceOf(canWriteSuperset, EntityType);
    assert.equal(canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.resolvedType().collectionType.canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Product');
  });

  it(`doesn't resolve a pair of inout [~a], inout ~a`, async () => {
    const variable = TypeVariable.make('a');
    const collection = variable.collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: variable, direction: 'inout'}, {type: collection, direction: 'inout'}]);
    assert.isNull(result);
  });

  it('resolves a trio of in BigCollection<~a>, out BigCollection<~b>, in BigCollection<Product>', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const b = TypeVariable.make('b').bigCollectionOf();
    const c = EntityType.make(['Product'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);

    let canWriteSuperset = a.resolvedType().bigCollectionType.canWriteSuperset as EntityType;
    assert.instanceOf(canWriteSuperset, EntityType);
    assert.equal(canWriteSuperset.entitySchema.name, 'Product');

    canWriteSuperset = result.resolvedType().bigCollectionType.canWriteSuperset as EntityType;
    assert.instanceOf(canWriteSuperset, EntityType);
    assert.equal(canWriteSuperset.entitySchema.name, 'Product');

    canWriteSuperset = result.bigCollectionType.canWriteSuperset as EntityType;
    assert.instanceOf(canWriteSuperset, EntityType);
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Product');
  });

  it('resolves a trio of in [Thing], in [Thing], out [Product]', async () => {
    const a = EntityType.make(['Thing'], {}).collectionOf();
    const b = EntityType.make(['Thing'], {}).collectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in BigCollection<Thing>, in BigCollection<Thing>, out BigCollection<Product>', async () => {
    const a = EntityType.make(['Thing'], {}).bigCollectionOf();
    const b = EntityType.make(['Thing'], {}).bigCollectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of out [Product], in [Thing], in [Thing]', async () => {
    const a = EntityType.make(['Thing'], {}).collectionOf();
    const b = EntityType.make(['Thing'], {}).collectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of out BigCollection<Product>, in BigCollection<Thing>, in BigCollection<Thing>', async () => {
    const a = EntityType.make(['Thing'], {}).bigCollectionOf();
    const b = EntityType.make(['Thing'], {}).bigCollectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in [~a] (is Thing), in [~b] (is Thing), out [Product]', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.collectionType as TypeVariable).variable.resolution = resolution;
    (b.collectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in BigCollection<~a> (is Thing), in BigCollection<~b> (is Thing), out BigCollection<Product>', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const b = TypeVariable.make('b').bigCollectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.bigCollectionType as TypeVariable).variable.resolution = resolution;
    (b.bigCollectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a pair of in [~a] (is Thing), out [Product]', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.collectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.collectionType.canReadSubset.entitySchema.name, 'Product');
    assert.include(result.collectionType.canReadSubset.entitySchema.names, 'Thing');
    assert.equal(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a pair of in BigCollection<~a> (is Thing), out BigCollection<Product>', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.bigCollectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
    assert.include(result.bigCollectionType.canReadSubset.entitySchema.names, 'Thing');
    assert.equal(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], in [Product]`, async () => {
    const a = TypeVariable.make('a').collectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.collectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, in BigCollection<Product>`, async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.bigCollectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], inout [Product]`, async () => {
    const a = TypeVariable.make('a').collectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.collectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, inout BigCollection<Product>]`, async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const resolution = EntityType.make(['Thing'], {});
    (a.bigCollectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.isNull(result);
  });

  it('resolves inout [~a] (is Thing), in [~b] (is Thing), in [Product], in [~c], in [~d] (is Product)', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    let resolution = EntityType.make(['Thing'], {});
    (a.collectionType as TypeVariable).variable.resolution = resolution;
    (b.collectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const d = TypeVariable.make('c').collectionOf();
    const e = TypeVariable.make('d').collectionOf();
    resolution = EntityType.make(['Product', 'Thing'], {});
    (e.collectionType as TypeVariable).variable.resolution = resolution;
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.isNull(result);
  });

  it('resolves inout BigCollection<~a> (is Thing), in BC<~b> (is Thing), in BC<Product>, in BC<~c>, in BC<~d> (is Product)', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const b = TypeVariable.make('b').bigCollectionOf();
    let resolution = EntityType.make(['Thing'], {});
    (a.bigCollectionType as TypeVariable).variable.resolution = resolution;
    (b.bigCollectionType as TypeVariable).variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const d = TypeVariable.make('c').bigCollectionOf();
    const e = TypeVariable.make('d').bigCollectionOf();
    resolution = EntityType.make(['Product', 'Thing'], {});
    (e.bigCollectionType as TypeVariable).variable.resolution = resolution;
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't depend on ordering in assigning a resolution to a type variable`, async () => {
    let a = TypeVariable.make('a');
    const b = EntityType.make(['Product', 'Thing'], {});
    const c = EntityType.make(['Thing'], {});
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');

    a = TypeVariable.make('a');
    result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'in'}, {type: b, direction: 'out'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('correctly applies then resolves a one-sided Entity constraint', async () => {
    const manifest = await Manifest.parse(`
      interface Interface
        in ~a item

      particle Concrete
        in Product {} item

      particle Transformation
        host Interface particle0
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
      type: EntityType.make(['Product', 'Thing'], {}),
      direction: 'inout'
    };
    const collection = {
      type: EntityType.make(['Product', 'Thing'], {}).collectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(collection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, entity]));
  });

  it(`doesn't resolve Entity and BigCollection`, async () => {
    const entity = {
      type: EntityType.make(['Product', 'Thing'], {}),
      direction: 'inout'
    };
    const bigCollection = {
      type: EntityType.make(['Product', 'Thing'], {}).bigCollectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, entity]));
  });

  it(`doesn't resolve Collection and BigCollection`, async () => {
    const collection = {
      type: EntityType.make(['Product', 'Thing'], {}).collectionOf(),
      direction: 'inout'
    };
    const bigCollection = {
      type: EntityType.make(['Product', 'Thing'], {}).bigCollectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(collection.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, collection]));
  });

  it(`doesn't resolve Entity and Collection of type variable`, () => {
    const a = EntityType.make(['Thing'], {});
    const b = TypeVariable.make('a').collectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'inout'}]));
  });

  it(`doesn't resolve Entity and BigCollection of type variable`, () => {
    const a = EntityType.make(['Thing'], {});
    const b = TypeVariable.make('a').bigCollectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'inout'}]));
  });

  it(`doesn't resolve Collection and BigCollection of type variable`, () => {
    const a = EntityType.make(['Thing'], {}).collectionOf();
    const b = TypeVariable.make('a').bigCollectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'inout'}]));
  });

  it(`doesn't modify an input baseType if invoked through Handle.effectiveType`, async () => {
    const baseType = TypeVariable.make('a');
    const connection = {type: EntityType.make(['Thing'], {}), direction: 'inout'};
    const newType = Handle.effectiveType(baseType, [connection]);
    assert.notStrictEqual(baseType, newType);
    assert.isNull(baseType.variable.resolution);
    assert.isNotNull(newType.variable.resolution);
  });

  it('can compare a type variable with a Collection handle', async () => {
    const leftType = TypeVariable.make('a').collectionOf();
    const rightType = TypeVariable.make('b');
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a BigCollection handle', async () => {
    const leftType = TypeVariable.make('a').bigCollectionOf();
    const rightType = TypeVariable.make('b');
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a Collection handle (with constraints)', async () => {
    const canWrite = EntityType.make(['Product', 'Thing'], {});
    const leftType = TypeVariable.make('a').collectionOf();
    const rightType = TypeVariable.make('b', canWrite);
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a Collection handle (with constraints)', async () => {
    const canWrite = EntityType.make(['Product', 'Thing'], {});
    const leftType = TypeVariable.make('a').bigCollectionOf();
    const rightType = TypeVariable.make('b', canWrite);
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it(`doesn't mutate types provided to effectiveType calls`, () => {
    const a = TypeVariable.make('a');
    assert.isNull(a.variable._resolution);
    Handle.effectiveType(undefined, [{type: a, direction: 'inout'}]);
    assert.isNull(a.variable._resolution);
  });

  it('resolves a single Slot type', () => {
    const a = SlotType.make('f', 'h');
    const result = TypeChecker.processTypeList(null, [{type: a, direction: '`consume'}]);
    assert(result.canEnsureResolved());
    result.maybeEnsureResolved();
    assert(result.isResolved());
    assert(result.resolvedType() instanceof SlotType);
  });
});
