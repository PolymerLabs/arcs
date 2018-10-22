/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {Loader} from '../../runtime/ts-build/loader.js';
import {Manifest} from '../ts-build/manifest.js';

describe('recipe', function() {
  it('normalize errors', async () => {
    const manifest = await Manifest.parse(`
        schema S1
        schema S2
        particle P1
          in S1 s1
          out S2 s2
        recipe
          map as handle1
          map 'h0' as handle2
          map 'h0' as handle3
          slot 's0' as slot0
          slot 's0' as slot1
          P1
            s1 = handle1
            s2 -> handle2
    `);
    const recipe = manifest.recipes[0];
    recipe.handles[0]._mappedType = recipe.particles[0].connections['s2'].type;
    const options = {errors: new Map()};

    recipe.normalize(options);

    assert.equal(4, options.errors.size);
    recipe.handles.forEach(handle => assert.isTrue(options.errors.has(handle)));
    options.errors.has(recipe.slots[1]);
  });
  it('clones recipe', async () => {
    const manifest = await Manifest.parse(`
        particle Particle1
        recipe MyRecipe
          Particle1
    `);
    const recipe = manifest.recipes[0];
    const clonedRecipe = recipe.clone();
    assert.equal(recipe.toString(), clonedRecipe.toString());
  });
  it('validate handle connection types', async () => {
    const manifest = await Manifest.parse(`
        schema MyType
        schema MySubType extends MyType
        schema OtherType
        particle P1
          in MyType inMy
        particle P2
          out MyType outMy
        particle P3
          in MySubType inMy
        particle P4
          out MySubType outMy
        particle P5
          in [MyType] inMys
        particle P6
          in BigCollection<MyType> inMys
    `);

    const MyType = manifest.findSchemaByName('MyType').entityClass().type;
    const MySubType = manifest.findSchemaByName('MySubType').entityClass().type;
    const OtherType = manifest.findSchemaByName('OtherType').entityClass().type;

    // MyType and MySubType (sub class of MyType) are valid types for (in MyType)
    const p1ConnSpec = manifest.particles.find(p => p.name == 'P1').connections[0];
    assert.isTrue(p1ConnSpec.isCompatibleType(MyType));
    assert.isTrue(p1ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p1ConnSpec.isCompatibleType(OtherType));
    assert.isFalse(p1ConnSpec.isCompatibleType(MyType.collectionOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(MySubType.collectionOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(MyType.bigCollectionOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(MySubType.bigCollectionOf()));

    // Only MyType are valid types for (out MyType)
    const p2ConnSpec = manifest.particles.find(p => p.name == 'P2').connections[0];
    assert.isTrue(p2ConnSpec.isCompatibleType(MyType));
    assert.isFalse(p2ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p2ConnSpec.isCompatibleType(OtherType));

    // Only MySubType is a valid types for (in MySubType)
    const p3ConnSpec = manifest.particles.find(p => p.name == 'P3').connections[0];
    assert.isFalse(p3ConnSpec.isCompatibleType(MyType));
    assert.isTrue(p3ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p3ConnSpec.isCompatibleType(OtherType));

    // MyType and MySubType are valid types for (out MySubType)
    const p4ConnSpec = manifest.particles.find(p => p.name == 'P4').connections[0];
    assert.isTrue(p4ConnSpec.isCompatibleType(MyType));
    assert.isTrue(p4ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p4ConnSpec.isCompatibleType(OtherType));

    // MyType and MySubType are valid types for (in [MyType])
    const p5ConnSpec = manifest.particles.find(p => p.name == 'P5').connections[0];
    assert.isFalse(p5ConnSpec.isCompatibleType(MyType));
    assert.isFalse(p5ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p5ConnSpec.isCompatibleType(OtherType));
    assert.isTrue(p5ConnSpec.isCompatibleType(MyType.collectionOf()));
    assert.isTrue(p5ConnSpec.isCompatibleType(MySubType.collectionOf()));
    assert.isFalse(p5ConnSpec.isCompatibleType(MyType.bigCollectionOf()));
    assert.isFalse(p5ConnSpec.isCompatibleType(MySubType.bigCollectionOf()));

    // MyType and MySubType are valid types for (in BigCollection<MyType>)
    const p6ConnSpec = manifest.particles.find(p => p.name == 'P6').connections[0];
    assert.isFalse(p6ConnSpec.isCompatibleType(MyType));
    assert.isFalse(p6ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p6ConnSpec.isCompatibleType(OtherType));
    assert.isFalse(p6ConnSpec.isCompatibleType(MyType.collectionOf()));
    assert.isFalse(p6ConnSpec.isCompatibleType(MySubType.collectionOf()));
    assert.isTrue(p6ConnSpec.isCompatibleType(MyType.bigCollectionOf()));
    assert.isTrue(p6ConnSpec.isCompatibleType(MySubType.bigCollectionOf()));
  });
  it('keeps orphaned slots, handles and particles', async () => {
    const manifest = await Manifest.parse(`
      particle A in 'A.js'

      recipe
        create #data as h0
        slot #master as s0
        A
    `);

    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    assert.lengthOf(recipe.slots, 1);
    assert.lengthOf(recipe.particles, 1);
    assert.lengthOf(recipe.handles, 1);
  });
  it(`is resolved if an optional handle with dependents is not connected`, async () => {
    const manifest = await Manifest.parse(`
      particle A in 'A.js'
        in [Foo {}]? optionalIn
          out [Foo {}] dependentOut

      recipe
        A
    `);

    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
  });

  it(`is not resolved if a handle is connected but its parent isn't`, async () => {
    const manifest = await Manifest.parse(`
      particle A in 'A.js'
        in [Foo {}]? optionalIn
          out [Foo {}] dependentOut

      particle B in 'B.js'
        in [Foo {}] parentIn
          out [Foo {}] dependentOut

      recipe
        create as h0
        A
          dependentOut -> h0

      recipe
        create as h0
        B
          dependentOut -> h0
    `);

    const [recipe1, recipe2] = manifest.recipes;
    assert.isTrue(recipe1.normalize());
    assert.isFalse(recipe1.isResolved());

    assert.isTrue(recipe2.normalize());
    assert.isFalse(recipe2.isResolved());
  });

  it(`is not resolved if a handle type is not resolved`, async () => {
    const manifest = await Manifest.parse(`
      particle A in 'B.js'
        in ~a foo1
        in ~a foo2
      recipe
        create as h0 // ~a
        use 'foo-id' as h1 // ~a
        A
          foo1 <- h0
          foo2 <- h1
    `);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert.isFalse(recipe.isResolved());
    assert.isFalse(recipe.handles[0].isResolved());
    assert.isFalse(recipe.handles[1].isResolved());
  });

  const getFirstRecipeHash = async manifestContent => {
    const loader = new Loader();
    const manifest = await Manifest.parse(manifestContent,
        {loader, fileName: './manifest.manifest'});
    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());
    return recipe.digest();
  };

  it('generates the same hash on manifest re-parse for immediates', async () => {
    const manifestContent = `
      shape HostedParticleShape
        in ~a *
        consume

      schema Foo

      particle A in 'A.js'
        host HostedParticleShape hostedParticle
        consume set of annotation

      particle B in 'B.js'
        in Foo foo
        consume annotation

      recipe
        A
          hostedParticle <- B
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.equal(digestA, digestB);
  });

  it('generates the same hash on manifest re-parse for stores', async () => {
    const manifestContent = `
      store NobId of NobIdStore {Text nobId} in NobIdJson
       resource NobIdJson
         start
         [{"nobId": "12345"}]

      particle A in 'A.js'
        in NobIdStore {Text nobId} foo

      recipe
        use NobId as foo
        A
          foo <- foo
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.equal(digestA, digestB);
  });

  it('generates the same hash on manifest re-parse for stores of collections', async () => {
    const manifestContent = `
      store NobId of [NobIdStore {Text nobId}] in NobIdJson
       resource NobIdJson
         start
         [{"nobId": "12345"}, {"nobId": "67890"}]

      particle A in 'A.js'
        in [NobIdStore {Text nobId}] foo

      recipe
        use NobId as foo
        A
          foo <- foo
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.equal(digestA, digestB);
  });
  it('verifies required consume and provide slot connections', async () => {
    const manifest = await Manifest.parse(`
      particle A
        must consume slotA
          must provide slotA1
          provide slotA2
        consume slotB
          must provide slotB1
          provide slotB2

      particle AA
        consume slotAA

      recipe NoRequiredConsumeSlot // 0
        A

      recipe NoRequireProvideSlot // 1
        slot '0' as slot0
        A
          consume slotA as slot0

      recipe RequiredSlotsOk // 2
        slot '0' as slot0
        A
          consume slotA as slot0
            provide slotA1 as slot1
        AA
          consume slotAA as slot1

      recipe NoRequiredSlotsInOptionalConsume // 3
        slot '0' as slot0
        slot '2' as slot2
        A
          consume slotA as slot0
            provide slotA1 as slot1
          consume slotB as slot2
        AA
          consume slotAA as slot1

      recipe AllRequiredSlotsOk // 4
        slot '0' as slot0
        slot '2' as slot2
        A
          consume slotA as slot0
            provide slotA1 as slot1
          consume slotB as slot2
            provide slotB1 as slot3
        AA
          consume slotAA as slot1
        AA
          consume slotAA as slot3
      `);

    assert.lengthOf(manifest.recipes, 5);
    manifest.recipes.forEach(recipe => assert(recipe.normalize()));
    assert.isFalse(manifest.recipes[0].isResolved());
    assert.isFalse(manifest.recipes[1].isResolved());
    assert.isTrue(manifest.recipes[2].isResolved());
    assert.isFalse(manifest.recipes[3].isResolved());
    assert.isTrue(manifest.recipes[4].isResolved());
  });
  it('verifies required consume connection is provided by a fullfilled slot', async () => {
    const manifest = await Manifest.parse(`
      particle A
        consume slot1
          must provide slot2
        consume slot3
      particle B
        must consume slot2
      recipe
        slot 'id-0' as remoteSlot0
        A
          consume slot1
            provide slot2 as slot2 // provided by an unfulfilled slot connection
          consume slot3 as remoteSlot0
        B
          consume slot2 as slot2
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert.isFalse(recipe.isResolved());
  });
  it('considers type resolution as recipe update', async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      particle Generic
        in ~a any
      particle Specific
        in Thing thing
      recipe
        map as thingHandle
        Generic
          any <- thingHandle
        Specific
          thing <- thingHandle
      store MyThings of Thing 'my-things' in ThingsJson
      resource ThingsJson
        start
        [{}]
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    recipe.handles[0].id = 'my-things';
    recipe.normalize();
    assert.isFalse(recipe.isResolved());
    assert.equal(`recipe
  map 'my-things' as handle0 // ~
  Generic as particle0
    any <- handle0
  Specific as particle1
    thing <- handle0`, recipe.toString());
    assert.equal(`recipe
  map 'my-things' as handle0 // ~ // Thing {}  // unresolved handle: unresolved type
  Generic as particle0
    any <- handle0
  Specific as particle1
    thing <- handle0`, recipe.toString({showUnresolved: true}));
    const hash = await recipe.digest();

    const recipeClone = recipe.clone();
    const hashClone = await recipeClone.digest();
    assert.equal(hash, hashClone);

    const store = manifest.findStoreByName('MyThings');
    recipeClone.handles[0].mapToStorage(store);
    recipeClone.normalize();
    assert.isTrue(recipeClone.isResolved());
    const hashResolvedClone = await recipeClone.digest();
    assert.equal(`recipe
  map 'my-things' as handle0 // Thing {}
  Generic as particle0
    any <- handle0
  Specific as particle1
    thing <- handle0`, recipeClone.toString());
    assert.equal(recipeClone.toString(), recipeClone.toString({showUnresolved: true}));
    assert.notEqual(hash, hashResolvedClone);
  });
});
