/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Handle as HandleImpl} from '../recipe/handle.js';
import {TypeChecker, TypeListInfo} from '../recipe/type-checker.js';
import {EntityType, SlotType, TypeVariable, CollectionType, BigCollectionType, TupleType, Type} from '../type.js';
import {Schema} from '../schema.js';

describe('TypeChecker', () => {
  it('resolves a trio of in [~a], out [~b], in [Product]', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    const c = EntityType.make(['Product'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'writes'}, {type: c, direction: 'reads'}]);
    const canWriteSuperset = a.resolvedType().collectionType.canWriteSuperset as EntityType;

    assert.instanceOf(canWriteSuperset, EntityType);
    assert.strictEqual(canWriteSuperset.entitySchema.name, 'Product');
    assert.strictEqual((result.resolvedType() as CollectionType<EntityType>).collectionType.canWriteSuperset.entitySchema.name, 'Product');
    if (result.isCollectionType() && result.collectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.collectionType.canWriteSuperset.entitySchema.name, 'Product');
    }
    else {
      assert.fail('result should be a collection of a typeVariable with an entity constraint');
    }
  });

  it(`doesn't resolve a pair of inout [~a], inout ~a`, async () => {
    const variable = TypeVariable.make('a');
    const collection = variable.collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: variable, direction: 'reads writes'}, {type: collection, direction: 'reads writes'}]);
    assert.isNull(result);
  });

  it('resolves a trio of in BigCollection<~a>, out BigCollection<~b>, in BigCollection<Product>', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const b = TypeVariable.make('b').bigCollectionOf();
    const c = EntityType.make(['Product'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'writes'}, {type: c, direction: 'reads'}]);

    let canWriteSuperset = a.resolvedType().bigCollectionType.canWriteSuperset as EntityType;
    assert.instanceOf(canWriteSuperset, EntityType);
    assert.strictEqual(canWriteSuperset.entitySchema.name, 'Product');

    canWriteSuperset = (result.resolvedType() as BigCollectionType<EntityType>).bigCollectionType.canWriteSuperset as EntityType;
    assert.instanceOf(canWriteSuperset, EntityType);
    assert.strictEqual(canWriteSuperset.entitySchema.name, 'Product');

    if (result.isBigCollectionType() && result.bigCollectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Product');
    } else {
      assert.fail('result should be a bigCollection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a trio of in [Thing], in [Thing], out [Product]', async () => {
    const a = EntityType.make(['Thing'], {}).collectionOf();
    const b = EntityType.make(['Thing'], {}).collectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'reads'}, {type: c, direction: 'writes'}]);
    if (result.isCollectionType() && result.collectionType.canReadSubset instanceof EntityType && result.collectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.collectionType.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a collection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a trio of in BigCollection<Thing>, in BigCollection<Thing>, out BigCollection<Product>', async () => {
    const a = EntityType.make(['Thing'], {}).bigCollectionOf();
    const b = EntityType.make(['Thing'], {}).bigCollectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'reads'}, {type: c, direction: 'writes'}]);
    if (result.isBigCollectionType() && result.bigCollectionType.canReadSubset instanceof EntityType && result.bigCollectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a bigCollection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a trio of out [Product], in [Thing], in [Thing]', async () => {
    const a = EntityType.make(['Thing'], {}).collectionOf();
    const b = EntityType.make(['Thing'], {}).collectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'writes'}, {type: a, direction: 'reads'}, {type: b, direction: 'reads'}]);
    if (result.isCollectionType() && result.collectionType.canReadSubset instanceof EntityType && result.collectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.collectionType.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a collection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a trio of out BigCollection<Product>, in BigCollection<Thing>, in BigCollection<Thing>', async () => {
    const a = EntityType.make(['Thing'], {}).bigCollectionOf();
    const b = EntityType.make(['Thing'], {}).bigCollectionOf();
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'writes'}, {type: a, direction: 'reads'}, {type: b, direction: 'reads'}]);
    if (result.isBigCollectionType() && result.bigCollectionType.canReadSubset instanceof EntityType && result.bigCollectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a bigCollection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a trio of in [~a] (is Thing), in [~b] (is Thing), out [Product]', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    const resolution = EntityType.make(['Thing'], {});
    a.collectionType.variable.resolution = resolution;
    b.collectionType.variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'reads'}, {type: c, direction: 'writes'}]);
    if (result.isCollectionType() && result.collectionType.canReadSubset instanceof EntityType && result.collectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.collectionType.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a collection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a trio of in BigCollection<~a> (is Thing), in BigCollection<~b> (is Thing), out BigCollection<Product>', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const b = TypeVariable.make('b').bigCollectionOf();
    const resolution = EntityType.make(['Thing'], {});
    a.bigCollectionType.variable.resolution = resolution;
    b.bigCollectionType.variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'reads'}, {type: c, direction: 'writes'}]);
    if (result.isBigCollectionType() && result.bigCollectionType.canReadSubset instanceof EntityType && result.bigCollectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a bigCollection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a pair of in [~a] (is Thing), out [Product]', async () => {
    const a = TypeVariable.make('a').collectionOf();
    a.collectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: c, direction: 'writes'}]);
    if (result.isCollectionType() && result.collectionType.canReadSubset instanceof EntityType && result.collectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.collectionType.canReadSubset.entitySchema.name, 'Product');
      assert.include(result.collectionType.canReadSubset.entitySchema.names, 'Thing');
      assert.strictEqual(result.collectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a collection of a typeVariable with an entity constraint');
    }
  });

  it('resolves a pair of in BigCollection<~a> (is Thing), out BigCollection<Product>', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    a.bigCollectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: c, direction: 'writes'}]);
    if (result.isBigCollectionType() && result.bigCollectionType.canReadSubset instanceof EntityType && result.bigCollectionType.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(result.bigCollectionType.canReadSubset.entitySchema.name, 'Product');
      assert.include(result.bigCollectionType.canReadSubset.entitySchema.names, 'Thing');
      assert.strictEqual(result.bigCollectionType.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('result should be a bigCollection of a typeVariable with an entity constraint');
    }
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], in [Product]`, async () => {
    const a = TypeVariable.make('a').collectionOf();
    a.collectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'writes'}, {type: c, direction: 'reads'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, in BigCollection<Product>`, async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    a.bigCollectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'writes'}, {type: c, direction: 'reads'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], inout [Product]`, async () => {
    const a = TypeVariable.make('a').collectionOf();
    a.collectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'writes'}, {type: c, direction: 'reads writes'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, inout BigCollection<Product>]`, async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    a.bigCollectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'writes'}, {type: c, direction: 'reads writes'}]);
    assert.isNull(result);
  });

  it('resolves inout [~a] (is Thing), in [~b] (is Thing), in [Product], in [~c], in [~d] (is Product)', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    let resolution = EntityType.make(['Thing'], {});
    a.collectionType.variable.resolution = resolution;
    b.collectionType.variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const d = TypeVariable.make('c').collectionOf();
    const e = TypeVariable.make('d').collectionOf();
    resolution = EntityType.make(['Product', 'Thing'], {});
    e.collectionType.variable.resolution = resolution;
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads writes'}, {type: b, direction: 'reads'}, {type: c, direction: 'reads'}, {type: d, direction: 'reads'}, {type: e, direction: 'reads'}]);
    assert.isNull(result);
  });

  it('resolves inout BigCollection<~a> (is Thing), in BC<~b> (is Thing), in BC<Product>, in BC<~c>, in BC<~d> (is Product)', async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    const b = TypeVariable.make('b').bigCollectionOf();
    let resolution = EntityType.make(['Thing'], {});
    a.bigCollectionType.variable.resolution = resolution;
    b.bigCollectionType.variable.resolution = resolution;
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const d = TypeVariable.make('c').bigCollectionOf();
    const e = TypeVariable.make('d').bigCollectionOf();
    resolution = EntityType.make(['Product', 'Thing'], {});
    e.bigCollectionType.variable.resolution = resolution;
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads writes'}, {type: b, direction: 'reads'}, {type: c, direction: 'reads'}, {type: d, direction: 'reads'}, {type: e, direction: 'reads'}]);
    assert.isNull(result);
  });

  it(`doesn't depend on ordering in assigning a resolution to a type variable`, async () => {
    let a = TypeVariable.make('a');
    const b = EntityType.make(['Product', 'Thing'], {});
    const c = EntityType.make(['Thing'], {});
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: b, direction: 'writes'}, {type: c, direction: 'reads'}]);
    if (a.variable.canReadSubset instanceof EntityType && a.variable.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(a.variable.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('a should be a type variable with EntityType constraints');
    }

    a = TypeVariable.make('a');
    result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'reads'}, {type: c, direction: 'reads'}, {type: b, direction: 'writes'}]);
    if (a.variable.canReadSubset instanceof EntityType && a.variable.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(a.variable.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('a should be a type variable with EntityType constraints');
    }
  });

  it('correctly applies then resolves a one-sided Entity constraint', async () => {
    const manifest = await Manifest.parse(`
      interface Interface
        item: reads ~a

      particle Concrete
        item: reads Product {}

      particle Transformation
        particle0: hosts Interface
        collection: reads [~a]

      recipe
        h0: create
        Transformation
          particle0: hosts Concrete
          collection: reads h0
    `);

    const recipe = manifest.recipes[0];
    const type = HandleImpl.effectiveType(null, recipe.handles[0].connections);
    assert.strictEqual(false, type.isResolved());
    assert.strictEqual(true, type.canEnsureResolved());
    assert.strictEqual(true, type.maybeEnsureResolved());
    assert.strictEqual(true, type.isResolved());
    assert.strictEqual('Product', (type.resolvedType() as CollectionType<EntityType>).collectionType.entitySchema.names[0]);

    recipe.normalize();
    assert.strictEqual(true, recipe.isResolved());
  });

  it(`doesn't resolve Entity and Collection`, async () => {
    const entity: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}),
      direction: 'reads writes'
    };
    const collection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).collectionOf(),
      direction: 'reads writes'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(collection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, entity]));
  });

  it(`doesn't resolve Entity and BigCollection`, async () => {
    const entity: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}),
      direction: 'reads writes'
    };
    const bigCollection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).bigCollectionOf(),
      direction: 'reads writes'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, entity]));
  });

  it(`doesn't resolve Collection and BigCollection`, async () => {
    const collection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).collectionOf(),
      direction: 'reads writes'
    };
    const bigCollection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).bigCollectionOf(),
      direction: 'reads writes'
    };

    assert.isNull(TypeChecker.processTypeList(collection.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, collection]));
  });

  it(`doesn't resolve Entity and Collection of type variable`, () => {
    const a = EntityType.make(['Thing'], {});
    const b = TypeVariable.make('a').collectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'reads writes'}]));
  });

  it(`doesn't resolve Entity and BigCollection of type variable`, () => {
    const a = EntityType.make(['Thing'], {});
    const b = TypeVariable.make('a').bigCollectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'reads writes'}]));
  });

  it(`doesn't resolve Collection and BigCollection of type variable`, () => {
    const a = EntityType.make(['Thing'], {}).collectionOf();
    const b = TypeVariable.make('a').bigCollectionOf();
    assert.isNull(TypeChecker.processTypeList(a, [{type: b, direction: 'reads writes'}]));
  });

  it(`doesn't modify an input baseType if invoked through Handle.effectiveType`, async () => {
    const baseType = TypeVariable.make('a');
    const newType = HandleImpl.effectiveType(baseType, [
      {type: EntityType.make(['Thing'], {}), direction: 'reads writes'}]);
    assert.notStrictEqual(baseType as Type, newType);
    assert.isNull(baseType.variable.resolution);
    assert.isNotNull(newType instanceof TypeVariable && newType.variable.resolution);
  });

  it('resolves a type variable to its min type by default', () => {
    const concreteType = EntityType.make(['Product'], {name: 'Text', phone: 'Number'}).collectionOf();
    const constraint = EntityType.make([], {name: 'Text'});
    const variableType = TypeVariable.make('a', constraint, null).collectionOf();
    TypeChecker.processTypeList(null, [
      {type: concreteType, direction: 'writes'},
      {type: variableType, direction: 'reads'},
    ]);
    variableType.maybeEnsureResolved();
    assert.deepStrictEqual(variableType.getEntitySchema(), constraint.getEntitySchema());
  });

  it('can resolve a type variable to its max type', () => {
    const concreteType = EntityType.make(['Product'], {name: 'Text', phone: 'Number'}).collectionOf();
    const constraint = EntityType.make([], {name: 'Text'});
    const variableType = TypeVariable.make('a', constraint, null, true).collectionOf();
    TypeChecker.processTypeList(null, [
      {type: concreteType, direction: 'writes'},
      {type: variableType, direction: 'reads'},
    ]);
    variableType.maybeEnsureResolved();
    assert.deepStrictEqual(variableType.getEntitySchema(), concreteType.getEntitySchema());
  });

  it('resolves a type variable to its min type through an intermediary variable by default', () => {
    const concreteType = EntityType.make(['Product'], {name: 'Text', phone: 'Number'}).collectionOf();
    const constraint = EntityType.make([], {name: 'Text'});
    const variable = TypeVariable.make('a', constraint, null);
    const redactorInputType = new TypeVariable(variable.variable).collectionOf();
    const redactorOutputType = variable.collectionOf();
    const egressType = TypeVariable.make('x', null, null, false).collectionOf();
    TypeChecker.processTypeList(null, [
      {type: concreteType, direction: 'writes'},
      {type: redactorInputType, direction: 'reads'},
    ]);
    TypeChecker.processTypeList(null, [
      {type: redactorOutputType, direction: 'writes'},
      {type: egressType, direction: 'reads'},
    ]);
    egressType.maybeEnsureResolved();
    assert.deepStrictEqual(egressType.getEntitySchema(), constraint.getEntitySchema());
  });

  it('can resolve a type variable to its max type through an intermediary variable', () => {
    const concreteType = EntityType.make(['Product'], {name: 'Text', phone: 'Number'}).collectionOf();
    const constraint = EntityType.make([], {name: 'Text'});
    const variable = TypeVariable.make('a', constraint, null);
    const redactorInputType = new TypeVariable(variable.variable).collectionOf();
    const redactorOutputType = variable.collectionOf();
    const egressType = TypeVariable.make('x', null, null, true).collectionOf();
    TypeChecker.processTypeList(null, [
      {type: concreteType, direction: 'writes'},
      {type: redactorInputType, direction: 'reads'},
    ]);
    TypeChecker.processTypeList(null, [
      {type: redactorOutputType, direction: 'writes'},
      {type: egressType, direction: 'reads'},
    ]);
    egressType.maybeEnsureResolved();
    assert.deepStrictEqual(egressType.getEntitySchema(), concreteType.getEntitySchema());
  });

  it('can resolve a type variable to its max type through an intermediary variable via a manifest', async () => {
    const manifest = await Manifest.parse(`
        particle OrderIngestion in '.OrderIngestion'
          data: writes [Product {sku: Text, name: Text, price: Number}]

        particle SkuRedactor in '.SkuRedactor'
          input: reads [~a with {sku: Text}]
          output: writes [~a]

        particle Egress in '.Egress'
          data: reads [~x with {sku: Text, *}]

        recipe Shop
          beforeRedaction: create
          afterRedaction: create
          OrderIngestion
            data: beforeRedaction
          SkuRedactor
            input: beforeRedaction
            output: afterRedaction
          Egress 
            data: afterRedaction
    `);

    const recipe = manifest.recipes[0];

    const orderParticle = recipe.particles.find(p => p.name === 'OrderIngestion').spec;
    const egressParticle = recipe.particles.find(p => p.name === 'Egress').spec;

    const concreteType = orderParticle.connections.find(c => c.name === 'data').type as CollectionType<EntityType>;
    const egressType = egressParticle.connections.find(c => c.name === 'data').type as TypeVariable;

    recipe.normalize();

    assert.isTrue(egressType.maybeEnsureResolved());
    assert.deepStrictEqual(egressType.getEntitySchema(), concreteType.getEntitySchema());
    assert.deepStrictEqual(Object.keys(egressType.getEntitySchema().fields), ['sku', 'name', 'price']);
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

  it('can compare a type variable with a tuple', async () => {
    const leftType = TypeVariable.make('a');
    const rightType = new TupleType([TypeVariable.make('b'), TypeVariable.make('c')]);
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a type variable with a tuple (with constraints)', async () => {
    const canWrite = EntityType.make(['Product', 'Thing'], {});
    const leftType = TypeVariable.make('a', canWrite);
    const rightType = new TupleType([TypeVariable.make('b'), TypeVariable.make('c')]);
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a collection with a tuple', async () => {
    const leftType = TypeVariable.make('a').collectionOf();
    const rightType = new TupleType([TypeVariable.make('b'), TypeVariable.make('c')]);
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare a tuple of references with a tuple of variables', async () => {
    const leftType = new TupleType([
      EntityType.make(['Thing'], {}).referenceTo(),
      EntityType.make(['Product'], {}).referenceTo()
    ]);
    const rightType = new TupleType([
      TypeVariable.make('a'),
      TypeVariable.make('b')
    ]);
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare equal tuples of entity references', async () => {
    const leftType = new TupleType([
      EntityType.make(['Thing'], {}).referenceTo(),
      EntityType.make(['Product'], {}).referenceTo()
    ]);
    const rightType = new TupleType([
      EntityType.make(['Thing'], {}).referenceTo(),
      EntityType.make(['Product'], {}).referenceTo()
    ]);
    assert.isTrue(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isTrue(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare different tuples of entity references', async () => {
    const leftType = new TupleType([
      EntityType.make(['Thing'], {}).referenceTo(),
      EntityType.make(['Product'], {}).referenceTo()
    ]);
    const rightType = new TupleType([
      EntityType.make(['Person'], {}).referenceTo(),
      EntityType.make(['Friend'], {}).referenceTo()
    ]);
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it('can compare tuples of entity references, one strictly smaller than the other', async () => {
    const leftType = new TupleType([
      EntityType.make(['Thing', 'Product'], {}).referenceTo(),
      EntityType.make(['Person', 'Friend'], {}).referenceTo()
    ]);
    const rightType = new TupleType([
      EntityType.make(['Product'], {}).referenceTo(),
      EntityType.make(['Friend'], {}).referenceTo()
    ]);
    assert.isTrue(TypeChecker.compareTypes(
      {type: leftType, direction: 'writes'},
      {type: rightType, direction: 'reads'}
    ));
    assert.isFalse(TypeChecker.compareTypes(
      {type: leftType, direction: 'reads'},
      {type: rightType, direction: 'writes'}
    ));
  });

  it('can compare tuples of different arities', async () => {
    const leftType = new TupleType([TypeVariable.make('a'), TypeVariable.make('b')]);
    const rightType = new TupleType([TypeVariable.make('c')]);
    assert.isFalse(TypeChecker.compareTypes({type: leftType}, {type: rightType}));
    assert.isFalse(TypeChecker.compareTypes({type: rightType}, {type: leftType}));
  });

  it(`doesn't mutate types provided to effectiveType calls`, () => {
    const a = TypeVariable.make('a');
    assert.isNull(a.variable._resolution);
    HandleImpl.effectiveType(undefined, [{type: a, direction: 'reads writes'}]);
    assert.isNull(a.variable._resolution);
  });

  it('resolves a single Slot type', () => {
    const a = SlotType.make('f', 'h');
    const result = TypeChecker.processTypeList(null, [{type: a, direction: '`consumes'}]);
    assert(result.canEnsureResolved());
    result.maybeEnsureResolved();
    assert(result.isResolved());
    assert(result.resolvedType() instanceof SlotType);
  });

  it('resolves a less restrictive inline entity write against a more restrictive inline entity read', () => {
    const innerWriteSchema = new EntityType(new Schema(['Inner'], {a: 'Text', b: 'Number'}));
    const outerWriteSchema = new Schema(['Outer'], {inner: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerWriteSchema}}});
    const writeType = new EntityType(outerWriteSchema);

    const innerReadSchema = new EntityType(new Schema(['Inner'], {a: 'Text'}));
    const outerReadSchema = new Schema(['Outer'], {inner: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerReadSchema}}});
    const readType = new EntityType(outerReadSchema);

    const result = TypeChecker.processTypeList(null, [{type: writeType, direction: 'writes'}, {type: readType, direction: 'reads'}]);
    assert(result.canEnsureResolved());
    result.maybeEnsureResolved();
    assert(result.isResolved());
    assert.deepEqual(result.getEntitySchema().fields['inner'], outerReadSchema.fields['inner']);
  });

  it('does not resolve a more restrictive inline entity write against a less restrictive inline entity read', () => {
    const innerWriteSchema = new EntityType(new Schema(['Inner'], {a: 'Text'}));
    const outerWriteSchema = new Schema(['Outer'], {inner: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerWriteSchema}}});
    const writeType = new EntityType(outerWriteSchema);

    const innerReadSchema = new EntityType(new Schema(['Inner'], {a: 'Text', b: 'Number'}));
    const outerReadSchema = new Schema(['Outer'], {inner: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerReadSchema}}});
    const readType = new EntityType(outerReadSchema);

    const result = TypeChecker.processTypeList(null, [{type: writeType, direction: 'writes'}, {type: readType, direction: 'reads'}]);
    assert.isNull(result);
  });

  it('resolves a list of less restrictive inline entities written against a list of more restrictive inline entities read', () => {
    const innerWriteSchema = new EntityType(new Schema(['Inner'], {a: 'Text', b: 'Number'}));
    const outerWriteSchema = new Schema(['Outer'], {inner: {kind: 'schema-ordered-list', schema: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerWriteSchema}}}});
    const writeType = new EntityType(outerWriteSchema);

    const innerReadSchema = new EntityType(new Schema(['Inner'], {a: 'Text'}));
    const outerReadSchema = new Schema(['Outer'], {inner: {kind: 'schema-ordered-list', schema: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerReadSchema}}}});
    const readType = new EntityType(outerReadSchema);

    const result = TypeChecker.processTypeList(null, [{type: writeType, direction: 'writes'}, {type: readType, direction: 'reads'}]);
    assert(result.canEnsureResolved());
    result.maybeEnsureResolved();
    assert(result.isResolved());
    assert.deepEqual(result.getEntitySchema().fields['inner'], outerReadSchema.fields['inner']);
  });

  it('does not resolve a list of more restrictive inline entities written against a list of less restrictive inline entities read', () => {
    const innerWriteSchema = new EntityType(new Schema(['Inner'], {a: 'Text'}));
    const outerWriteSchema = new Schema(['Outer'], {inner: {kind: 'schema-ordered-list', schema: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerWriteSchema}}}});
    const writeType = new EntityType(outerWriteSchema);

    const innerReadSchema = new EntityType(new Schema(['Inner'], {a: 'Text', b: 'Number'}));
    const outerReadSchema = new Schema(['Outer'], {inner: {kind: 'schema-ordered-list', schema: {kind: 'schema-nested', schema: {kind: 'schema-inline', model: innerReadSchema}}}});
    const readType = new EntityType(outerReadSchema);

    const result = TypeChecker.processTypeList(null, [{type: writeType, direction: 'writes'}, {type: readType, direction: 'reads'}]);
    assert.isNull(result);
  });

  describe('Tuples', () => {
    it('does not resolve tuple reads of different arities', () => {
      assert.isNull(TypeChecker.processTypeList(null, [
        {
          direction: 'reads',
          type: new TupleType([
            EntityType.make([], {}),
            EntityType.make([], {}),
          ]),
        },
        {
          direction: 'reads',
          type: new TupleType([
            EntityType.make([], {}),
          ]),
        },
      ]));
    });

    it('does not resolve conflicting entities in tuple read and write', () => {
      assert.isNull(TypeChecker.processTypeList(null, [
        {
          direction: 'reads',
          type: new TupleType([EntityType.make(['Product'], {})]),
        },
        {
          direction: 'writes',
          type: new TupleType([EntityType.make(['Thing'], {})]),
        },
      ]));
    });

    it('does not resolve conflicting types in tuple read and write', () => {
      assert.isNull(TypeChecker.processTypeList(null, [
        {
          direction: 'reads',
          type: new TupleType([EntityType.make(['Product'], {})]),
        },
        {
          direction: 'writes',
          type: new TupleType([EntityType.make(['Product'], {}).referenceTo()]),
        },
      ]));
    });

    it('can resolve multiple tuple reads', () => {
      const result = TypeChecker.processTypeList(null, [
        {
          direction: 'reads',
          type: new TupleType([
            EntityType.make(['Product'], {}),
            EntityType.make(['Place'], {}),
          ]),
        },
        {
          direction: 'reads',
          type: new TupleType([
            EntityType.make(['Object'], {}),
            EntityType.make(['Location'], {}),
          ]),
        },
      ]);
      // We only have read constraints, so we need to force the type variable to resolve.
      assert(result.maybeEnsureResolved());
      assert.deepEqual(result.resolvedType(), new TupleType([
        EntityType.make(['Product', 'Object'], {}),
        EntityType.make(['Place', 'Location'], {})
      ]));
    });

    const ENTITY_TUPLE_CONNECTION_LIST: TypeListInfo[] = [
      {direction: 'reads', type: new TupleType([EntityType.make(['Product'], {}), EntityType.make([], {})])},
      {direction: 'reads', type: new TupleType([EntityType.make([], {}), EntityType.make(['Location'], {})])},
      {direction: 'writes', type: new TupleType([EntityType.make(['Product'], {}), EntityType.make(['Place', 'Location'], {})])},
      {direction: 'writes', type: new TupleType([EntityType.make(['Product', 'Object'], {}), EntityType.make(['Location'], {})])},
    ];
    const ENTITY_TUPLE_CONNECTION_LIST_RESULT = new TupleType([EntityType.make(['Product'], {}), EntityType.make(['Location'], {})]);

    it('can resolve tuple of entities with read and write', () => {
      assert.deepEqual(
        TypeChecker.processTypeList(null, ENTITY_TUPLE_CONNECTION_LIST).resolvedType(),
        ENTITY_TUPLE_CONNECTION_LIST_RESULT
      );
    });

    it('can resolve collections of tuple of entities with read and write', () => {
      assert.deepEqual(
        TypeChecker.processTypeList(null, ENTITY_TUPLE_CONNECTION_LIST.map(({type, direction}) => ({
          type: type.collectionOf(),
          direction
        }))).resolvedType(),
        ENTITY_TUPLE_CONNECTION_LIST_RESULT.collectionOf()
      );
    });
  });
});
