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
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {Modality} from '../modality.js';
import {Type} from '../type.js';

describe('recipe', () => {
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
    recipe.handles[0].mappedType = recipe.particles[0].connections['s2'].type;
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
  it('clones recipe with require section', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        consume details
      recipe MyRecipe 
        require
          A
            consume root
              provide details as s0
        P1
          consume details as s0
    `);
    const recipe = manifest.recipes[0];
    const clonedRecipe = recipe.clone(); 
    assert.isTrue(recipe.slots[0] === recipe.requires[0].particles[0].consumedSlotConnections['root'].providedSlots['details'], 'recipe slots don\'t match');
    assert.isTrue(clonedRecipe.slots[0] === clonedRecipe.requires[0].particles[0].consumedSlotConnections['root'].providedSlots['details'], 'cloned recipe slots don\'t match');
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

    const myType = manifest.findSchemaByName('MyType').entityClass()['type'];
    const mySubType = manifest.findSchemaByName('MySubType').entityClass()['type'];
    const otherType = manifest.findSchemaByName('OtherType').entityClass()['type'];

    // MyType and MySubType (sub class of MyType) are valid types for (in MyType)
    const p1ConnSpec = manifest.particles.find(p => p.name === 'P1').handleConnections[0];
    assert.isTrue(p1ConnSpec.isCompatibleType(myType));
    assert.isTrue(p1ConnSpec.isCompatibleType(mySubType));
    assert.isFalse(p1ConnSpec.isCompatibleType(otherType));
    assert.isFalse(p1ConnSpec.isCompatibleType(myType.collectionOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(mySubType.collectionOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(myType.bigCollectionOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(mySubType.bigCollectionOf()));

    // Only MyType are valid types for (out MyType)
    const p2ConnSpec = manifest.particles.find(p => p.name === 'P2').handleConnections[0];
    assert.isTrue(p2ConnSpec.isCompatibleType(myType));
    assert.isFalse(p2ConnSpec.isCompatibleType(mySubType));
    assert.isFalse(p2ConnSpec.isCompatibleType(otherType));

    // Only MySubType is a valid types for (in MySubType)
    const p3ConnSpec = manifest.particles.find(p => p.name === 'P3').handleConnections[0];
    assert.isFalse(p3ConnSpec.isCompatibleType(myType));
    assert.isTrue(p3ConnSpec.isCompatibleType(mySubType));
    assert.isFalse(p3ConnSpec.isCompatibleType(otherType));

    // MyType and MySubType are valid types for (out MySubType)
    const p4ConnSpec = manifest.particles.find(p => p.name === 'P4').handleConnections[0];
    assert.isTrue(p4ConnSpec.isCompatibleType(myType));
    assert.isTrue(p4ConnSpec.isCompatibleType(mySubType));
    assert.isFalse(p4ConnSpec.isCompatibleType(otherType));

    // MyType and MySubType are valid types for (in [MyType])
    const p5ConnSpec = manifest.particles.find(p => p.name === 'P5').handleConnections[0];
    assert.isFalse(p5ConnSpec.isCompatibleType(myType));
    assert.isFalse(p5ConnSpec.isCompatibleType(mySubType));
    assert.isFalse(p5ConnSpec.isCompatibleType(otherType));
    assert.isTrue(p5ConnSpec.isCompatibleType(myType.collectionOf()));
    assert.isTrue(p5ConnSpec.isCompatibleType(mySubType.collectionOf()));
    assert.isFalse(p5ConnSpec.isCompatibleType(myType.bigCollectionOf()));
    assert.isFalse(p5ConnSpec.isCompatibleType(mySubType.bigCollectionOf()));

    // MyType and MySubType are valid types for (in BigCollection<MyType>)
    const p6ConnSpec = manifest.particles.find(p => p.name === 'P6').handleConnections[0];
    assert.isFalse(p6ConnSpec.isCompatibleType(myType));
    assert.isFalse(p6ConnSpec.isCompatibleType(mySubType));
    assert.isFalse(p6ConnSpec.isCompatibleType(otherType));
    assert.isFalse(p6ConnSpec.isCompatibleType(myType.collectionOf()));
    assert.isFalse(p6ConnSpec.isCompatibleType(mySubType.collectionOf()));
    assert.isTrue(p6ConnSpec.isCompatibleType(myType.bigCollectionOf()));
    assert.isTrue(p6ConnSpec.isCompatibleType(mySubType.bigCollectionOf()));
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
        in? [Foo {}] optionalIn
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
        in? [Foo {}] optionalIn
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
      interface HostedParticleInterface
        in ~a *
        consume

      schema Foo

      particle A in 'A.js'
        host HostedParticleInterface hostedParticle
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
  it('generates the same hash on same recipes with and without search', async () => {
    const digestA = await getFirstRecipeHash(`
      particle A in 'A.js'
      recipe
        A
    `);
    const digestB = await getFirstRecipeHash(`
      particle A in 'A.js'
      recipe
        search \`A\`
        A
    `);
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
  const isResolved = (recipe) => {
    const recipeClone = recipe.clone();
    assert.isTrue(recipeClone.normalize());
    return recipeClone.isResolved();
  };
  it('verifies modalities - no particles', async () => {
    // empty modality for recipe with no particles.
    const recipe = (await Manifest.parse(`recipe`)).recipes[0];
    assert.isEmpty(recipe.particles);
    assert.lengthOf(recipe.modality.names, Modality.all.names.length);
    assert.isTrue(recipe.modality.isResolved());
    assert.isTrue(isResolved(recipe));
  });
  it('verifies modalities - no slots', async () => {
    // empty modality for recipe with non slot consuming particles.
    const recipe = (await Manifest.parse(`
      particle P0
      particle P1
      particle P2
      recipe
        P0
        P1
        P2
    `)).recipes[0];
    assert.lengthOf(recipe.particles, 3);
    assert.lengthOf(recipe.modality.names, Modality.all.names.length);
    assert.isTrue(recipe.modality.isResolved());
    assert.isTrue(isResolved(recipe));
  });
  const createParticleSpecString = (name, slotName, modalities = []) => {
    return `
      particle ${name}
        ${slotName ? `consume ${slotName}` : ''}
        ${modalities.map(m => `modality ${m}`).join('\n        ')}`;
  };
  const createRecipeString = (modalities = {}) => {
    const str = `
      ${createParticleSpecString('P0', 'root', modalities['P0'])}
      ${createParticleSpecString('P1', 'root', modalities['P1'])}
      ${createParticleSpecString('P2', null, modalities['P2'])}
      ${createParticleSpecString('P3', 'root', modalities['P3'])}
      recipe
        slot 'slot-id' as root
        P0
          consume root as root
        P1
          consume root as root
        P2
        P3
          consume root as root`;
    return str;
  };
  it('verifies modalities - default', async () => {
    // Default 'dom' modality in all particles.
    const recipe = (await Manifest.parse(createRecipeString())).recipes[0];
    assert.deepEqual(recipe.modality.names, Modality.dom.names);
    assert.isTrue(recipe.modality.isResolved());
    assert.isTrue(isResolved(recipe));
  });
  it('verifies modalities - non matching', async () => {
    // empty modality intersection, no consumed slots, recipe is resolved.
    // P0 modalities: dom-touch, voice, vr; P1 modality: vr; P2 and P3 modality: dom(default).
    const recipe = (await Manifest.parse(createRecipeString({
      'P0': ['dom-touch', 'vr', 'voice'],
      'P1': ['vr']
    }))).recipes[0];
    assert.isEmpty(recipe.modality.names);
    assert.isFalse(recipe.modality.isResolved());
    assert.isFalse(isResolved(recipe));
  });
  it('verifies modalities - matching vr', async () => {
    // empty modality intersection, no consumed slots, recipe is resolved.
    // P0: dom-touch, voice, vr; P1: vr; P2: dom(default); P3: voice, vr.
    const recipe = (await Manifest.parse(createRecipeString({
      'P0': ['dom-touch', 'vr', 'voice'],
      'P1': ['vr'],
      'P3': ['voice', 'vr']
    }))).recipes[0];

    // resolved recipe with non empty modality names intersection.
    assert.deepEqual(recipe.modality.names, Modality.vr.names);
    assert.isTrue(recipe.modality.isResolved());
    assert.isTrue(isResolved(recipe));
    assert.isTrue(recipe.modality.isCompatible([Modality.Name.Vr]));
    assert.isFalse(recipe.modality.isCompatible([Modality.Name.Dom]));
  });
  it('comments unfullfilled slot connections', async () => {
    const recipe = (await Manifest.parse(`
      schema Thing
      particle MyParticle in 'myparticle.js'
        in Thing inThing
        consume mySlot
      recipe
        create as handle0
        MyParticle as particle0
          inThing <- handle0
    `)).recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isFalse(recipe.isResolved());
    assert.isTrue(recipe.toString({showUnresolved: true}).includes(
        'unresolved particle: unfullfilled slot connections'));
  });
  it('particles match if one particle is a subset of another', async () => {
    const recipes = (await Manifest.parse(`
      particle P0
        consume root
          provide details
      particle P1
        consume root

      recipe
        require
          P1
            consume root as s0
        P0
          consume root as s0
            provide details as s1
      
      recipe 
        P0
    `)).recipes;
    const recipe1 = recipes[0];
    const recipe2 = recipes[1];
    assert.isTrue(recipe2.particles[0].matches(recipe1.particles[0]), 'particle2 should match particle1 but doesn\'t');
    assert.isFalse(recipe1.particles[0].matches(recipe2.particles[0]), 'particle1 matches particle2 but it shouldn\'t');
  });
  it('slots with local names are the same in the recipe as they are in the require section', async () => {
    const recipe = (await Manifest.parse(`
      particle P0
        consume details 
          provide moreDetails 
      particle P1
        consume root 
          provide details 
      
      recipe 
        require
          slot as s1
          P1
            consume root
              provide details as s1
        P0
          consume details as s1
            provide moreDetails
    `)).recipes[0];
    const s1SlotRecipe = recipe.slots.find(slot => slot.name === 'details');
    const s1SlotRequire = recipe.requires[0].particles[0].consumedSlotConnections['root'].providedSlots['details'];
    assert.isTrue(s1SlotRecipe === s1SlotRequire, 'slot in require section is not the same as slot in recipe');
  });
  it('particles in require section don\'t need to have a particle spec', async () => {
    const recipe = (await Manifest.parse(`
      schema Type
      particle A
        in Type input
        consume details 
      
      recipe 
        require 
          B
            output -> h0
            consume root
              provide details as s0
        A
          input <- h0
          consume details as s0
    `)).recipes[0];
    assert(recipe.requires[0].particles[0].spec === undefined);
  });
  it('slots in require section with the same local name match', async () => {
    const recipe = (await Manifest.parse(`
      particle A
        consume details 
      particle B
        consume details
      particle C
        consume details

      
      recipe 
        require 
          A
            consume details as s0
          B 
            consume details as s0
        C
          consume details as s0
    `)).recipes[0];
    assert.isTrue(recipe.requires[0].particles[0].consumedSlotConnections['details'].targetSlot === recipe.requires[0].particles[1].consumedSlotConnections['details'].targetSlot, 'there is more than one slot');
    assert.isTrue(recipe.slots[0] === recipe.requires[0].particles[0].consumedSlotConnections['details'].targetSlot, 'slot in the require section doesn\'t match slot in the recipe');
  });
  it('recipe with require section toString method works', async () => {
    const recipe = (await Manifest.parse(`
      particle B
        consume root

      recipe
        require
          A as p1
            consume root
        B as p2
          consume root as s0`)).recipes[0];
    const recipeString = 'recipe\n  require\n    A as p1\n      consume root\n  B as p2\n    consume root as s0';
    assert.isTrue(recipe.toString() === recipeString.toString(), 'incorrect recipe toString method');
  });
  it('clones connections with type variables', async () => {
    const recipe = (await Manifest.parse(`
      schema Thing
      resource ThingResource
        start
        [
          {"name": "mything"}
        ]
      store ThingStore of Thing 'mything' in ThingResource
      particle P
        in ~a inThing
        inout [~a] outThing
      recipe
        map 'mything' as handle0
        create as handle1
        P
          inThing = handle0
          outThing = handle1
    `)).recipes[0];
    const verifyRecipe = (recipe, errorPrefix) => {
      const errors: string[] = [];
      const resolvedType = recipe.handleConnections[0].type.resolvedType();
      if (resolvedType !== recipe.handleConnections[1].type.getContainedType().resolvedType()) {
        errors.push(`${errorPrefix}: handle connection types mismatch`);
      }
      if (resolvedType !== recipe.handles[0].type.resolvedType()) {
        errors.push(`${errorPrefix}: handle0 type mismatch with handle-connection`);
      }
      if (resolvedType !== recipe.handles[1].type.getContainedType().resolvedType()) {
        errors.push(`${errorPrefix}: handle1 type mismatch with handle-connection`);
      }
      if (recipe.handles[0].type.resolvedType() !== recipe.handles[1].type.getContainedType().resolvedType()) {
        errors.push(`${errorPrefix}: handles type mismatch`);
      }
      assert.lengthOf(errors, 0, `\ndetailed errors: [\n${errors.join('\n')}\n]\n`);
      return resolvedType;
    };
    assert.isTrue(recipe.normalize());
    assert.equal(recipe.handleConnections[0].type, recipe.handleConnections[1].type.getContainedType());
    const recipeResolvedType = verifyRecipe(recipe, 'recipe');
    const type = recipe.handleConnections[0].type;

    // Clone the recipe and verify types consistency.
    const recipeClone = recipe.clone();
    const recipeCloneResolvedType = verifyRecipe(recipeClone, 'recipe-clone');
    assert.notEqual(recipeResolvedType, recipeCloneResolvedType);
  });
});
