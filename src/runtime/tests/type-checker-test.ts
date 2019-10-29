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
import {Handle} from '../recipe/handle.js';
import {TypeChecker, TypeListInfo} from '../recipe/type-checker.js';
import {EntityType, SlotType, TypeVariable, CollectionType, BigCollectionType} from '../type.js';
import {Direction} from '../manifest-ast-nodes.js';
import {Flags} from '../flags.js';

describe('TypeChecker', () => {
  it('resolves a trio of in [~a], out [~b], in [Product]', async () => {
    const a = TypeVariable.make('a').collectionOf();
    const b = TypeVariable.make('b').collectionOf();
    const c = EntityType.make(['Product'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, in BigCollection<Product>`, async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    a.bigCollectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out [~a (is Thing)], inout [Product]`, async () => {
    const a = TypeVariable.make('a').collectionOf();
    a.collectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).collectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.isNull(result);
  });

  it(`doesn't resolve a pair of out BigCollection<~a (is Thing)>, inout BigCollection<Product>]`, async () => {
    const a = TypeVariable.make('a').bigCollectionOf();
    a.bigCollectionType.variable.resolution = EntityType.make(['Thing'], {});
    const c = EntityType.make(['Product', 'Thing'], {}).bigCollectionOf();
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
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
    const result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.isNull(result);
  });

  it(`doesn't depend on ordering in assigning a resolution to a type variable`, async () => {
    let a = TypeVariable.make('a');
    const b = EntityType.make(['Product', 'Thing'], {});
    const c = EntityType.make(['Thing'], {});
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    if (a.variable.canReadSubset instanceof EntityType && a.variable.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(a.variable.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('a should be a type variable with EntityType constraints');
    }

    a = TypeVariable.make('a');
    result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'in'}, {type: b, direction: 'out'}]);
    if (a.variable.canReadSubset instanceof EntityType && a.variable.canWriteSuperset instanceof EntityType) {
      assert.strictEqual(a.variable.canReadSubset.entitySchema.name, 'Product');
      assert.strictEqual(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
    } else {
      assert.fail('a should be a type variable with EntityType constraints');
    }
  });

  it('SLANDLES SYNTAX correctly applies then resolves a one-sided Entity constraint', Flags.withPostSlandlesSyntax(async () => {
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
    const type = Handle.effectiveType(null, recipe.handles[0].connections);
    assert.strictEqual(false, type.isResolved());
    assert.strictEqual(true, type.canEnsureResolved());
    assert.strictEqual(true, type.maybeEnsureResolved());
    assert.strictEqual(true, type.isResolved());
    assert.strictEqual('Product', (type.resolvedType() as CollectionType<EntityType>).collectionType.entitySchema.names[0]);

    recipe.normalize();
    assert.strictEqual(true, recipe.isResolved());
  }));

  it('correctly applies then resolves a one-sided Entity constraint', Flags.withPreSlandlesSyntax(async () => {
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
    assert.strictEqual(false, type.isResolved());
    assert.strictEqual(true, type.canEnsureResolved());
    assert.strictEqual(true, type.maybeEnsureResolved());
    assert.strictEqual(true, type.isResolved());
    assert.strictEqual('Product', (type.resolvedType() as CollectionType<EntityType>).collectionType.entitySchema.names[0]);

    recipe.normalize();
    assert.strictEqual(true, recipe.isResolved());
  }));

  it(`doesn't resolve Entity and Collection`, async () => {
    const entity: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}),
      direction: 'inout'
    };
    const collection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).collectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [collection]));
    assert.isNull(TypeChecker.processTypeList(collection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, collection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [collection, entity]));
  });

  it(`doesn't resolve Entity and BigCollection`, async () => {
    const entity: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}),
      direction: 'inout'
    };
    const bigCollection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).bigCollectionOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [bigCollection]));
    assert.isNull(TypeChecker.processTypeList(bigCollection.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, bigCollection]));
    assert.isNull(TypeChecker.processTypeList(undefined, [bigCollection, entity]));
  });

  it(`doesn't resolve Collection and BigCollection`, async () => {
    const collection: TypeListInfo = {
      type: EntityType.make(['Product', 'Thing'], {}).collectionOf(),
      direction: 'inout'
    };
    const bigCollection: TypeListInfo = {
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
    const connection = {type: EntityType.make(['Thing'], {}), direction: 'inout' as Direction};
    const newType = Handle.effectiveType(baseType, [connection]);
    assert.notStrictEqual(baseType, newType);
    assert.isNull(baseType.variable.resolution);
    assert.isNotNull(newType instanceof TypeVariable && newType.variable.resolution);
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
