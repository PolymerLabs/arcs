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
import {EntityType, SlotType, TypeVariable, CollectionType, BigCollectionType, TupleType, Type} from '../type.js';
import {IsValidOptions} from '../recipe/recipe.js';

describe('TypeChecker', () => {
   it.only('gogul-type-checker-test', async () => {
   // ReadSome
   //    tapIn: reads tapOutHandle
   // tapOut: writes ~a
   // tapOutHandle: create
   // tapOut: writes tapOutHandle
  // particle ReadSome
  //   tapIn: reads Person {age: Number}
  // particle GenericGetPerson
  //   person: writes ~b
  // GenericGetPerson
  //    person: writes personHandle
     const manifest = await Manifest.parse(`
schema Person
  name: Text
  age: Number

particle PassThrough
  valueIn: reads ~a
  valueOut: writes ~a

particle WritePerson
  person: writes Person

particle WriteAge
  age: writes Person {age: Number}

particle DisplayGreeting
  person: reads Person {name: Text}

particle DisplayAge
  age: reads Person {age: Number}

recipe Test
   // Flipping order of handles makes the recipe valid.
   personHandle: create
   ageHandle: create
   WritePerson
      person: writes personHandle
   DisplayGreeting
      person: reads personHandle
   WriteAge
      age: writes ageHandle
   DisplayAge
      age: reads ageHandle
   PassThrough
      valueIn: reads personHandle
      valueOut: writes ageHandle
    `);
//        const manifest = await Manifest.parse(`
// schema TextAge
//    value: Text

// schema Age
//    value: Number

// particle P
//   textAge: reads ~a
//   age: reads ~a
//   textAgeCollection: writes ~a
//   ageCollection: writes ~a

// particle Q
//   ageCollection: reads Age

// particle GetTextAge
//   textAge: writes TextAge

// particle GetAge
//   age: writes Age

// recipe Test
//   ageCollectionHandle: create
//   textAgeCollectionHandle: create
//   ageHandle: create
//   textAgeHandle: create
//   GetTextAge
//     textAge: writes textAgeHandle
//   GetAge
//     age: writes ageHandle
//   P
//     textAge: reads textAgeHandle
//     age: reads ageHandle
//     textAgeCollection: writes textAgeCollectionHandle
//     ageCollection: writes ageCollectionHandle
//   Q
//     ageCollection: reads ageCollectionHandle
// `)

//        onsider a particle A that writes `[Foo { bar, baz }]`, another B that reads `[Foo { bar }]` and writes a singleton reference `&Foo`. And a third particle C that reads `Foo { baz }`.

// Now consider a fourth particle D that writes `[Foo { bar, other }]`.

// `A -> h1 -> B -> h2 -> C` works, but `D -> h3 -> B -> h4 -> C`, doesn't.

// I think the type system figures this out now, but if not, it should :) And it should work if `B` and `C` act on an entity that itself has a reference to a `Foo`.
//     const manifest = await Manifest.parse(`
// schema Foo
//   bar: Text
//   baz: Text
//   other: Text

// particle A
//   aw: writes [Foo {bar, baz}]

// particle B
//   br: reads [~a with {bar: Text}]
//   bw: writes ~a

// particle C
//   cr: reads Foo {baz}

// particle D
//   dw: writes [Foo {bar, other}]

// recipe Test
//   h1: create
//   h2: create
//   A
//     aw: writes h1
//   // D
//   //   dw: writes h1
//   B
//     br: reads h1
//     bw: writes h2
//   C
//     cr: reads h2
// `)
    const [recipe] = manifest.recipes;
    var options: IsValidOptions = {errors: new Map(), typeErrors: []};
    if (!recipe.normalize(options)) {
      console.log(`errors:`)
      for (let [key, value] of options.errors) {
          console.log(`${key}: ${value}`);
      }
      console.log(`typeErrors: ${options.typeErrors}`);
      assert.fail('cannot normalize recipe');
    } else {
      console.log(`Recipe: ${recipe.name}`)
      // this.type.resolvedType().toString({hideFields: options.hideFields == undefined ? true: options.hideFields}
      for (const handle of recipe.handles) {
          console.log(`${handle.localName}: ${handle.type.canWriteSuperset}, ${handle.type.canReadSubset}`);
          var htype = handle.type.resolvedType();
          if (htype.canWriteSuperset != null) {
              console.log(`NOT NULL`)
              if (htype.canWriteSuperset.isResolved()) {
                  const x = htype.toString()
                  console.log(`RESOLVED: ${x}.`)
                  if (htype.isCollectionType()) {
                      const x = htype.collectionType.resolvedType().toString()
                      console.log(`COLLECTION: ${x}.`)
                  }
              }
        }
        console.log("Connections:");
        for (const cnxn of handle.connections) {
            console.log(` ${cnxn.name} of ${cnxn.particle.spec.name}: ${cnxn.type.canWriteSuperset}, ${cnxn.type.canReadSubset}`);
            // if (cnxn.resolvedType().canWriteSuperset != null && cnxn.resolvedType().canWriteSuperset.isCollectionType()) {
            //     console.log(`__COLLECTION__`);
            // }
        }
      }
    }
  });

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
    const type = Handle.effectiveType(null, recipe.handles[0].connections);
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
    const newType = Handle.effectiveType(baseType, [
      {type: EntityType.make(['Thing'], {}), direction: 'reads writes'}]);
    assert.notStrictEqual(baseType as Type, newType);
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
    Handle.effectiveType(undefined, [{type: a, direction: 'reads writes'}]);
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
