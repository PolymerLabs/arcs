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
import Loader from '../../runtime/loader.js';
import Manifest from '../manifest.js';
import Recipe from '../recipe/recipe.js';

describe('recipe', function() {
  it('normalize errors', async () => {
    let manifest = await Manifest.parse(`
        schema S1
        schema S2
        particle P1
          P1(in S1 s1, out S2 s2)
        recipe
          map as view1
          map 'h0' as view2
          map 'h0' as view3
          slot 's0' as slot0
          slot 's0' as slot1
          P1
            s1 = view1
            s2 -> view2
    `);
    let recipe = manifest.recipes[0];
    recipe.handles[0]._mappedType = recipe.particles[0].connections['s2'].type;
    let options = {errors: new Map()};

    recipe.normalize(options);

    assert.equal(4, options.errors.size);
    recipe.handles.forEach(handle => assert.isTrue(options.errors.has(handle)));
    options.errors.has(recipe.slots[1]);
  });
  it('clones recipe', async () => {
    let manifest = await Manifest.parse(`
        particle Particle1
          Particle1()
        recipe MyRecipe
          Particle1
    `);
    let recipe = manifest.recipes[0];
    let clonedRecipe = recipe.clone();
    assert.equal(recipe.toString(), clonedRecipe.toString());
  });
  it('validate handle connection types', async () => {
    let manifest = await Manifest.parse(`
        schema MyType
        schema MySubType extends MyType
        schema OtherType
        particle P1
          P1(in MyType inMy)
        particle P2
          P2(out MyType outMy)
        particle P3
          P3(in MySubType inMy)
        particle P4
          P4(out MySubType outMy)
        particle P5
          P5(in [MyType] inMys)
    `);

    let MyType = manifest.findSchemaByName('MyType').entityClass().type;
    let MySubType = manifest.findSchemaByName('MySubType').entityClass().type;
    let OtherType = manifest.findSchemaByName('OtherType').entityClass().type;

    // MyType and MySubType (sub class of MyType) are valid types for (in MyType)
    let p1ConnSpec = manifest.particles.find(p => p.name == 'P1').connections[0];
    assert.isTrue(p1ConnSpec.isCompatibleType(MyType));
    assert.isTrue(p1ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p1ConnSpec.isCompatibleType(OtherType));
    assert.isFalse(p1ConnSpec.isCompatibleType(MyType.setViewOf()));
    assert.isFalse(p1ConnSpec.isCompatibleType(MySubType.setViewOf()));

    // Only MyType are valid types for (out MyType)
    let p2ConnSpec = manifest.particles.find(p => p.name == 'P2').connections[0];
    assert.isTrue(p2ConnSpec.isCompatibleType(MyType));
    assert.isFalse(p2ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p2ConnSpec.isCompatibleType(OtherType));

    // Only MySubType is a valid types for (in MySubType)
    let p3ConnSpec = manifest.particles.find(p => p.name == 'P3').connections[0];
    assert.isFalse(p3ConnSpec.isCompatibleType(MyType));
    assert.isTrue(p3ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p3ConnSpec.isCompatibleType(OtherType));

    // MyType and MySubType are valid types for (out MySubType)
    let p4ConnSpec = manifest.particles.find(p => p.name == 'P4').connections[0];
    assert.isTrue(p4ConnSpec.isCompatibleType(MyType));
    assert.isTrue(p4ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p4ConnSpec.isCompatibleType(OtherType));

    // MyType and MySubType are valid types for (in [MyType])
    let p5ConnSpec = manifest.particles.find(p => p.name == 'P5').connections[0];
    assert.isFalse(p5ConnSpec.isCompatibleType(MyType));
    assert.isFalse(p5ConnSpec.isCompatibleType(MySubType));
    assert.isFalse(p5ConnSpec.isCompatibleType(OtherType));
    assert.isTrue(p5ConnSpec.isCompatibleType(MyType.setViewOf()));
    assert.isTrue(p5ConnSpec.isCompatibleType(MySubType.setViewOf()));
  });
  it('keeps orphaned slots, handles and particles', async () => {
    let manifest = await Manifest.parse(`
      particle A in 'A.js'
        A()

      recipe
        create #data as h0
        slot #master as s0
        A
    `);

    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    assert.lengthOf(recipe.slots, 1);
    assert.lengthOf(recipe.particles, 1);
    assert.lengthOf(recipe.handles, 1);
  });

  const getFirstRecipeHash = async manifestContent => {
    let loader = new Loader();
    let manifest = await Manifest.parse(manifestContent,
        {loader, fileName: './manifest.manifest'});
    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());
    return recipe.digest();
  };

  it('generates the same hash regardless of session for immediates', async () => {
    // The `shape` definition below will have an id that includes the manifest
    // id. We want to make sure that doesn't propagate into causing variance for
    // the recipe digest.
    const manifestContent = `
      shape HostedParticleShape
        HostedParticleShape(in ~a)
        consume

      schema Foo

      particle A in 'A.js'
        A(host HostedParticleShape hostedParticle)
        consume set of annotation

      particle B in 'B.js'
        B(in Foo foo)
        consume annotation

      recipe
        A
          hostedParticle <- B
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.equal(digestA, digestB);
  });

  it('generates the same hash regardless of session for stores', async () => {
    // The `store` definition below will have an id that includes the manifest
    // id. We want to make sure that doesn't propagate into causing variance for
    // the recipe digest.
    const manifestContent = `
      store NobId of NobIdStore {Text nobId} in NobIdJson
       resource NobIdJson
         start
         [{"nobId": "12345"}]

      particle A in 'A.js'
        A(in NobIdStore {Text nobId} foo)

      recipe
        use NobId as foo
        A
          foo <- foo
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.equal(digestA, digestB);
  });

  it('generates the same hash regardless of session for stores of collections', async () => {
    // The `store` definition below will have an id that includes the manifest
    // id. We want to make sure that doesn't propagate into causing variance for
    // the recipe digest.
    const manifestContent = `
      store NobId of [NobIdStore {Text nobId}] in NobIdJson
       resource NobIdJson
         start
         [{"nobId": "12345"}, {"nobId": "67890"}]

      particle A in 'A.js'
        A(in [NobIdStore {Text nobId}] foo)

      recipe
        use NobId as foo
        A
          foo <- foo
    `;
    const digestA = await getFirstRecipeHash(manifestContent);
    const digestB = await getFirstRecipeHash(manifestContent);
    assert.equal(digestA, digestB);
  });
});
