/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Loader} from '../../../platform/loader.js';
import {Manifest} from '../../manifest.js';
import {Modality} from '../../arcs-types/modality.js';
import {Capabilities, Ttl, Persistence, Queryable, DeletePropagation} from '../../capabilities.js';
import {Entity} from '../../entity.js';
import {Recipe} from '../lib-recipe.js';
import {TestVolatileMemoryProvider} from '../../testing/test-volatile-memory-provider.js';
import {RamDiskStorageDriverProvider} from '../../storage/drivers/ramdisk.js';
import {Runtime} from '../../runtime.js';

describe('recipe', () => {
  let runtime;
  beforeEach(() => {
    runtime = new Runtime();
  });

  it('normalize errors', async () => {
    const manifest = await runtime.parse(`
        schema S1
        schema S2
        particle P1
          s1: reads S1
          s2: writes S2
        recipe
          handle1: map *
          handle2: map 'h0'
          handle3: map 'h0'
          slot0: slot 's0'
          slot1: slot 's0'
          P1
            s1: handle1
            s2: writes handle2
    `);
    const recipe = manifest.recipes[0];
    recipe.handles[0].mappedType = recipe.particles[0].connections['s2'].type;
    const options = {errors: new Map()};

    recipe.normalize(options);

    assert.strictEqual(4, options.errors.size, 'expects four errors');
    recipe.handles.forEach(handle => assert.isTrue(options.errors.has(handle)));
    options.errors.has(recipe.slots[1]);
  });
  it('clones recipe', async () => {
    const manifest = await runtime.parse(`
        particle Particle1
        recipe MyRecipe
          Particle1
    `);
    const recipe = manifest.recipes[0];
    const clonedRecipe = recipe.clone();
    assert.strictEqual(recipe.toString(), clonedRecipe.toString());
  });
  it('clones recipe with require section', async () => {
    const manifest = await runtime.parse(`
      particle P1
        details: consumes Slot
      recipe MyRecipe
        require
          A
            root: consumes
              details: provides s0
        P1
          details: consumes s0
    `);
    const recipe = manifest.recipes[0];
    const clonedRecipe = recipe.clone();
    assert.isTrue(recipe.slots[0] === recipe.requires[0].particles[0].getSlotConnectionByName('root').providedSlots['details'], 'recipe slots don\'t match');
    assert.isTrue(clonedRecipe.slots[0] === clonedRecipe.requires[0].particles[0].getSlotConnectionByName('root').providedSlots['details'], 'cloned recipe slots don\'t match');
  });
  it('validate handle connection types', async () => {
    const manifest = await runtime.parse(`
        schema MyType
        schema MySubType extends MyType
        schema OtherType
        particle P1
          inMy: reads MyType
        particle P2
          outMy: writes MyType
        particle P3
          inMy: reads MySubType
        particle P4
          outMy: writes MySubType
        particle P5
          inMys: reads [MyType]
        particle P6
          inMys: reads BigCollection<MyType>
    `);

    const myType = Entity.createEntityClass(manifest.findSchemaByName('MyType'), null)['type'];
    const mySubType = Entity.createEntityClass(manifest.findSchemaByName('MySubType'), null)['type'];
    const otherType = Entity.createEntityClass(manifest.findSchemaByName('OtherType'), null)['type'];

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
        h0: create #data
        s0: slot #master
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
        optionalIn: reads? [Foo {}]
          dependentOut: writes [Foo {}]

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
        optionalIn: reads? [Foo {}]
          dependentOut: writes [Foo {}]

      particle B in 'B.js'
        parentIn: reads [Foo {}]
          dependentOut: writes [Foo {}]

      recipe
        h0: create *
        A
          dependentOut: writes h0

      recipe
        h0: create *
        B
          dependentOut: writes h0
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
        foo1: reads ~a
        foo2: reads ~a
      recipe
        h0: create * // ~a
        h1: use 'foo-id' // ~a
        A
          foo1: reads h0
          foo2: reads h1
    `);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert.isFalse(recipe.isResolved());
    assert.isFalse((recipe.handles[0])['isResolved']());
    assert.isFalse((recipe.handles[1])['isResolved']());
  });

  const getFirstRecipeHash = async manifestContent => {
    const manifest = await runtime.parse(manifestContent, {fileName: 'test.file'});
    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());
    return recipe.digest();
  };

  it('generates the same hash on manifest re-parse for immediates', async () => {
    const manifestContent = `
      interface HostedParticleInterface
        reads ~a
        consumes Slot

      schema Foo

      particle A in 'A.js'
        hostedParticle: hosts HostedParticleInterface
        annotation: consumes [Slot]

      particle B in 'B.js'
        foo: reads Foo
        annotation: consumes Slot

      recipe
        A
          hostedParticle: reads B
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.strictEqual(digestA, digestB);
  });

  it('generates the same hash on manifest re-parse for stores', async () => {
    const manifestContent = `
      store NobId of NobIdStore {nobId: Text} in NobIdJson
       resource NobIdJson
         start
         [{"nobId": "12345"}]

      particle A in 'A.js'
        foo: reads NobIdStore {nobId: Text}

      recipe
        foo: use NobId
        A
          foo: reads foo
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.strictEqual(digestA, digestB);
  });

  it('generates the same hash on manifest re-parse for stores of collections', async () => {
    const manifestContent = `
      store NobId of [NobIdStore {nobId: Text}] in NobIdJson
       resource NobIdJson
         start
         [{"nobId": "12345"}, {"nobId": "67890"}]

      particle A in 'A.js'
        foo: reads [NobIdStore {nobId: Text}]

      recipe
        foo: use NobId
        A
          foo: reads foo
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.strictEqual(digestA, digestB);
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
    assert.strictEqual(digestA, digestB);
  });
  it('verifies required consume and provide slot connections', async () => {
    const manifest = await Manifest.parse(`
      particle A
        slotA: consumes Slot
          slotA1: provides Slot
          slotA2: provides? Slot
        slotB: consumes? Slot
          slotB1: provides Slot
          slotB2: provides? Slot

      particle AA
        slotAA: consumes Slot

      recipe NoRequiredConsumeSlot // 0
        A

      recipe NoRequireProvideSlot // 1
        slot0: slot '0'
        A
          slotA: consumes slot0

      recipe RequiredSlotsOk // 2
        slot0: slot '0'
        A
          slotA: consumes slot0
            slotA1: provides slot1
        AA
          slotAA: consumes slot1

      recipe NoRequiredSlotsInOptionalConsume // 3
        slot0: slot '0'
        slot2: slot '2'
        A
          slotA: consumes slot0
            slotA1: provides slot1
          slotB: consumes slot2
        AA
          slotAA: consumes slot1

      recipe AllRequiredSlotsOk // 4
        slot0: slot '0'
        slot2: slot '2'
        A
          slotA: consumes slot0
            slotA1: provides slot1
          slotB: consumes slot2
            slotB1: provides slot3
        AA
          slotAA: consumes slot1
        AA
          slotAA: consumes slot3
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
        slot1: consumes Slot
          slot2: provides Slot
        slot3: consumes? Slot
      particle B
        slot2: consumes Slot
      recipe
        remoteSlot0: slot 'id-0'
        A
          slot1: consumes slot1
            slot2: provides slot2 // provided by an unfulfilled slot connection
          slot3: consumes remoteSlot0
        B
          slot2: consumes slot2
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert.isFalse(recipe.isResolved());
  });
  it('considers type resolution as recipe update', async () => {
    const manifest = await runtime.parse(`
      schema Thing
      particle Generic
        anyA: reads ~a
      particle Specific
        thing: reads Thing
      recipe
        thingHandle: map *
        Generic
          anyA: reads thingHandle
        Specific
          thing: reads thingHandle
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
    assert.strictEqual(`recipe
  handle0: map 'my-things' // ~
  Generic as particle0
    anyA: reads handle0
  Specific as particle1
    thing: reads handle0`, recipe.toString());
    assert.strictEqual(`recipe
  handle0: map 'my-things' // ~ // Thing {}  // unresolved handle: unresolved type
  Generic as particle0
    anyA: reads handle0
  Specific as particle1
    thing: reads handle0`, recipe.toString({showUnresolved: true}));
    const hash = await recipe.digest();

    const recipeClone = recipe.clone();
    const hashClone = await recipeClone.digest();
    assert.strictEqual(hash, hashClone);

    const store = manifest.findStoreByName('MyThings');
    recipeClone.handles[0].mapToStorage(store);
    recipeClone.normalize();
    assert.isTrue(recipeClone.isResolved());
    const hashResolvedClone = await recipeClone.digest();
    assert.strictEqual(`recipe
  handle0: map 'my-things' // Thing {}
  Generic as particle0
    anyA: reads handle0
  Specific as particle1
    thing: reads handle0`, recipeClone.toString());
    assert.strictEqual(recipeClone.toString(), recipeClone.toString({showUnresolved: true}));
    assert.notStrictEqual(hash, hashResolvedClone);
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
    assert.equal(recipe.modality, Modality.all);
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
    assert.equal(recipe.modality, Modality.all);
    assert.isTrue(recipe.modality.isResolved());
    assert.isTrue(isResolved(recipe));
  });
  const createParticleSpecString = (name, slotName, modalities = []) => {
    return `
      particle ${name}
        ${slotName ? `${slotName}: consumes Slot` : ''}
        ${modalities.map(m => `modality ${m}`).join('\n        ')}`;
  };
  const createRecipeString = (modalities = {}) => {
    const str = `
      ${createParticleSpecString('P0', 'root', modalities['P0'])}
      ${createParticleSpecString('P1', 'root', modalities['P1'])}
      ${createParticleSpecString('P2', null, modalities['P2'])}
      ${createParticleSpecString('P3', 'root', modalities['P3'])}
      recipe
        root: slot 'slot-id'
        P0
          root: consumes root
        P1
          root: consumes root
        P2
        P3
          root: consumes root`;
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
    // P0 modalities: domTouch, voice, vr; P1 modality: vr; P2 and P3 modality: dom(default).
    const recipe = (await Manifest.parse(createRecipeString({
      'P0': ['domTouch', 'vr', 'voice'],
      'P1': ['vr']
    }))).recipes[0];
    assert.isEmpty(recipe.modality.names);
    assert.isFalse(recipe.modality.isResolved());
    assert.isFalse(isResolved(recipe));
  });
  it('verifies modalities - matching vr', async () => {
    // empty modality intersection, no consumed slots, recipe is resolved.
    // P0: domTouch, voice, vr; P1: vr; P2: dom(default); P3: voice, vr.
    const recipe = (await Manifest.parse(createRecipeString({
      'P0': ['domTouch', 'vr', 'voice'],
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
  const createSlandlesParticleSpecString = (name, slotName, modalities = []) => {
    return `
      particle ${name}
        ${slotName ? `${slotName}: \`consumes Slot` : ''}
        ${modalities.map(m => `modality ${m}`).join('\n        ')}`;
  };
  const createSlandlesRecipeString = (modalities = {}) => {
    const str = `
      ${createSlandlesParticleSpecString('P0', 'root', modalities['P0'])}
      ${createSlandlesParticleSpecString('P1', 'root', modalities['P1'])}
      ${createSlandlesParticleSpecString('P2', null,   modalities['P2'])}
      ${createSlandlesParticleSpecString('P3', 'root', modalities['P3'])}
      recipe
        root: \`slot 'slot-id'
        P0
          root: \`consumes root
        P1
          root: \`consumes root
        P2
        P3
          root: \`consumes root`;
    return str;
  };
  it('SLANDLES verifies modalities - default', async () => {
    // Default 'dom' modality in all particles.
    const recipe = (await Manifest.parse(createSlandlesRecipeString())).recipes[0];
    assert.deepEqual(recipe.modality.names, Modality.dom.names);
    assert.isTrue(recipe.modality.isResolved());
    assert.isTrue(isResolved(recipe));
  });
  it('SLANDLES verifies modalities - non matching', async () => {
    // empty modality intersection, no consumed slots, recipe is resolved.
    // P0 modalities: domTouch, voice, vr; P1 modality: vr; P2 and P3 modality: dom(default).
    const recipe = (await Manifest.parse(createSlandlesRecipeString({
      'P0': ['domTouch', 'vr', 'voice'],
      'P1': ['vr']
    }))).recipes[0];
    assert.isEmpty(recipe.modality.names);
    assert.isFalse(recipe.modality.isResolved());
    assert.isFalse(isResolved(recipe));
  });
  it('SLANDLES verifies modalities - matching vr', async () => {
    // empty modality intersection, no consumed slots, recipe is resolved.
    // P0: domTouch, voice, vr; P1: vr; P2: dom(default); P3: voice, vr.
    const recipe = (await Manifest.parse(createSlandlesRecipeString({
      'P0': ['domTouch', 'vr', 'voice'],
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
  it('comments unfulfilled slot connections', async () => {
    const recipe = (await Manifest.parse(`
      schema Thing
      particle MyParticle in 'myparticle.js'
        inThing: reads Thing
        mySlot: consumes Slot
      recipe
        handle0: create *
        MyParticle as particle0
          inThing: reads handle0
    `)).recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isFalse(recipe.isResolved());
    assert.include(recipe.toString({showUnresolved: true}),
        'unresolved particle: unfulfilled slot connections');
  });
  it('SLANDLES comments unfulfilled slandle connections', async () => {
    const recipe = (await Manifest.parse(`
      schema Thing
      particle MyParticle in 'myparticle.js'
        inThing: reads Thing
        mySlot: \`consumes Slot
      recipe
        handle0: create *
        MyParticle as particle0
          inThing: reads handle0
    `)).recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isFalse(recipe.isResolved());
    assert.include(recipe.toString({showUnresolved: true}),
        'unresolved particle: unresolved connections');
  });
  it('particles match if one particle is a subset of another', async () => {
    const recipes = (await Manifest.parse(`
      particle P0
        root: consumes Slot
          details: provides Slot
      particle P1
        root: consumes Slot

      recipe
        require
          P1
            root: consumes s0
        P0
          root: consumes s0
            details: provides s1

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
        details: consumes Slot
          moreDetails: provides? Slot
      particle P1
        root: consumes Slot
          details: provides? Slot

      recipe
        require
          s1: slot *
          P1
            root: consumes
              details: provides s1
        P0
          details: consumes s1
            moreDetails: provides

    `)).recipes[0];
    const s1SlotRecipe = recipe.slots.find(slot => slot.name === 'details');
    const s1SlotRequire = recipe.requires[0].particles[0].getSlotConnectionByName('root').providedSlots['details'];
    assert.isTrue(s1SlotRecipe === s1SlotRequire, 'slot in require section is not the same as slot in recipe');
  });
  it('particles in require section don\'t need to have a particle spec', async () => {
    const recipe = (await Manifest.parse(`
      schema Type
      particle A
        input: reads Type
        details: consumes Slot

      recipe
        require
          B
            output: writes h0
            root: consumes
              details: provides s0
        A
          input: reads h0
          details: consumes s0
    `)).recipes[0];
    assert(recipe.requires[0].particles[0].spec === undefined);
  });
  it('slots in require section with the same local name match', async () => {
    const recipe = (await Manifest.parse(`
      particle A
        details: consumes Slot
      particle B
        details: consumes Slot
      particle C
        details: consumes Slot

      recipe
        require
          A
            details: consumes s0
          B
            details: consumes s0
        C
          details: consumes s0
    `)).recipes[0];
    assert.isTrue(recipe.requires[0].particles[0].getSlotConnectionByName('details').targetSlot === recipe.requires[0].particles[1].getSlotConnectionByName('details').targetSlot, 'there is more than one slot');
    assert.strictEqual(recipe.slots[0], recipe.requires[0].particles[0].getSlotConnectionByName('details').targetSlot, 'slot in the require section doesn\'t match slot in the recipe');
  });
  it('recipe with require section toString method works', async () => {
    const recipe = (await Manifest.parse(`
      particle B
        root: consumes

      recipe
        require
          A as p1
            root: consumes
        B as p2
          root: consumes s0`)).recipes[0];
    const recipeString = 'recipe\n  require\n    A as p1\n      root: consumes\n  B as p2\n    root: consumes s0';
    assert.strictEqual(recipe.toString(), recipeString.toString(), 'incorrect recipe toString method');
  });

  it('clones connections with type variables', async () => {
    const manifest = await runtime.parse(`
      schema Thing
      resource ThingResource
        start
        [
          {"name": "mything"}
        ]
      store ThingStore of Thing 'mything' in ThingResource
      particle P
        inThing: reads ~a
        outThing: reads writes [~a]
      recipe
        handle0: map 'mything'
        handle1: create *
        P
          inThing: handle0
          outThing: handle1
    `);
    const recipe = manifest.recipes[0];
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
    assert.strictEqual(recipe.handleConnections[0].type, recipe.handleConnections[1].type.getContainedType());
    const recipeResolvedType = verifyRecipe(recipe, 'recipe');
    const type = recipe.handleConnections[0].type;

    // Clone the recipe and verify types consistency.
    const recipeClone = recipe.clone();
    const recipeCloneResolvedType = verifyRecipe(recipeClone, 'recipe-clone');
    assert.notStrictEqual(recipeResolvedType, recipeCloneResolvedType);
  });
  it('parses recipe handle ttls', async () => {
    const recipe = (await Manifest.parse(`
      recipe
        h0: create @ttl('20d')
        h1: create @ttl('5m')
        h2: create
    `)).recipes[0];
    assert.lengthOf(recipe.handles, 3);
    assert.isTrue(recipe.handles[0].capabilities.getTtl().isEquivalent(Ttl.days(20)));
    assert.isTrue(recipe.handles[0].getTtl().isEquivalent(Ttl.days(20)));
    assert.isTrue(recipe.handles[0].capabilities.hasEquivalent(Ttl.days(20)));
    assert.isTrue(recipe.handles[1].capabilities.getTtl().isEquivalent(Ttl.minutes(5)));
    assert.isTrue(recipe.handles[1].getTtl().isEquivalent(Ttl.minutes(5)));
    assert.isTrue(recipe.handles[1].capabilities.hasEquivalent(Ttl.minutes(5)));
    assert.isUndefined(recipe.handles[2].capabilities.getTtl());
    assert.isTrue(recipe.handles[2].getTtl().isInfinite);
  });
  it('parses recipe handle capabilities', async () => {
    const recipe = (await Manifest.parse(`
      recipe Thing
        h0: create @persistent
        h1: create 'my-id' @tiedToRuntime
        h2: create #myTag @persistent @queryable
        h3: create @persistent @ttl('20d')
        h4: create @ttl('20d')
        h5: create #otherTag`)).recipes[0];
    const verifyRecipeHandleCapabilities = (recipe) => {
      assert.lengthOf(recipe.handles, 6);
      assert.isTrue(
        recipe.handles[0].capabilities.isEquivalent(Capabilities.create([Persistence.onDisk()])));
      assert.isTrue(recipe.handles[1].capabilities.isShareable());
      assert.isTrue(recipe.handles[2].capabilities.isEquivalent(
            Capabilities.create([Persistence.onDisk(), new Queryable(true)])));
      assert.isTrue(recipe.handles[3].capabilities.isEquivalent(
            Capabilities.create([Persistence.onDisk(), Ttl.days(20)])));
      assert.isTrue(
          recipe.handles[4].capabilities.getTtl().isEquivalent(Ttl.days(20)));
      assert.isTrue(recipe.handles[5].capabilities.isEmpty());
    };
    verifyRecipeHandleCapabilities(recipe);
    verifyRecipeHandleCapabilities((await Manifest.parse(recipe.toString())).recipes[0]);
  });
  it('adds queryable capability to handles with refinements', async () => {
    const recipe = (await Manifest.parse(`
      schema Thing
        t1: Number
        t2: Number
      particle MyParticle
        a: writes Thing {t1}
        b: writes ThingB {b1: Number, b2: Text}
        c: writes ThingC {a1: Number, a2: Text} [a1 > 0]
        d: writes Thing {t1} [t1 > 5]
        e: writes Thing {t1} [t1 < 100]
      recipe Thing
        hA: create
        hB: create
        hC: create
        hD: create
        hE: create @persistent @queryable
        MyParticle
          a: hA
          b: hB
          c: hC
          d: hD
          e: hE
    `)).recipes[0];
    assert.isTrue(recipe.normalize());
    const particle = recipe.particles[0];
    assert.isTrue(particle.connections['a'].handle.capabilities.isEmpty());
    assert.isTrue(particle.connections['b'].handle.capabilities.isEmpty());
    assert.isTrue(particle.connections['c'].handle.capabilities.isEquivalent(
        Capabilities.create([new Queryable(true)])));
    assert.isTrue(particle.connections['d'].handle.capabilities.isEquivalent(
        Capabilities.create([new Queryable(true)])));
    assert.isTrue(particle.connections['e'].handle.capabilities.isEquivalent(
        Capabilities.create([Persistence.onDisk(), new Queryable(true)])));
  });
  it('adds delete propagation capability to handles with hard refs', async () => {
    const recipe = (await Manifest.parse(`
      schema Hr
      schema Inner2
        t: &Hr @hardRef
      schema Inner
        j: inline Inner2
      particle MyParticle
        a: writes Thing {t: &Hr @hardRef}
        b: writes Thing {i: inline Inner}
        c: writes Thing {i: List<inline Inner2>}
        d: writes [Thing {i: inline Inner}]
        e: writes [Thing {t: &Hr @hardRef}]
        f: writes Thing {i: &Inner}
        g: writes Thing {t: [&Hr] @hardRef}
        h: writes Thing {t: List<&Hr> @hardRef}
      recipe Thing
        hA: create
        hB: create
        hC: create
        hD: create
        hE: create
        hF: create
        hG: create
        hH: create
        MyParticle
          a: hA
          b: hB
          c: hC
          d: hD
          e: hE
          f: hF
          g: hG
          h: hH
    `)).recipes[0];
    assert.isTrue(recipe.normalize());
    const particle = recipe.particles[0];
    assert.isTrue(particle.connections['a'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isTrue(particle.connections['b'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isTrue(particle.connections['c'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isTrue(particle.connections['d'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isTrue(particle.connections['e'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isFalse(particle.connections['f'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isTrue(particle.connections['g'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
    assert.isTrue(particle.connections['h'].handle.capabilities.isEquivalent(
      Capabilities.create([new DeletePropagation(true)])));
  });
  it('can normalize and clone a recipe with a synthetic join handle', async () => {
    const [recipe] = (await Manifest.parse(`
      recipe
        people: map #folks
        other: map #products
        pairs: join (people, places)
        places: map #locations`)).recipes;

    const verify = (recipe: Recipe) => {
      assert.lengthOf(recipe.handles, 4);
      const people = recipe.handles.find(h => h.tags.includes('folks'));
      assert.equal(people.fate, 'map');
      const places = recipe.handles.find(h => h.tags.includes('locations'));
      assert.equal(places.fate, 'map');

      const pairs = recipe.handles.find(h => h.fate === 'join');
      assert.equal(pairs.fate, 'join');
      assert.lengthOf(pairs.joinedHandles, 2);
      assert.include(pairs.joinedHandles, people);
      assert.include(pairs.joinedHandles, places);
    };

    verify(recipe);

    recipe.normalize();
    verify(recipe);

    verify(recipe.clone());
  });
});
