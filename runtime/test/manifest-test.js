/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let Manifest = require('../manifest.js');
let assert = require('chai').assert;

async function assertRecipeParses(input, result) {
  // Strip common leading whitespace.
  //result = result.replace(new Regex(`()^|\n)${result.match(/^ */)[0]}`), '$1'),
  let target = (await Manifest.parse(result)).recipes[0].toString();
  assert.deepEqual((await Manifest.parse(input)).recipes[0].toString(), target);
}

describe('manifest', function() {
  it('can parse a manifest containing a recipe', async () => {
    let manifest = await Manifest.parse(`
      recipe SomeRecipe
        map as someView
        renders 'someView' as slot0
        renders as slot1
        SomeParticle
          someParam -> #tag
          consumes mySlot as slot0
          provides otherSlot as slot1`);
    let recipe = manifest.recipes[0];
    assert(recipe);
    assert.equal(recipe.particles.length, 1);
    assert.equal(recipe.views.length, 1);
    assert.equal(recipe.viewConnections.length, 1);
    assert.sameMembers(recipe.viewConnections[0].tags, ['#tag']);
    // TODO: populate and verify slots and slotconnections in the recipe
  });
  it('can parse a manifest containing a particle specification', async () => {
    let manifest = await Manifest.parse(`
      particle Chooser in 'chooser.js'
        Chooser(in [Product] choices, out [Product] resultList)

        renders: action(resultList) none-need

        Description {
          pattern: Choose from \${choices}
        }`);
  });
  it('can parse a manifest containing a schema', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        normative
          Text value`);
    assert.equal(manifest.schemas.Bar.normative.value, 'Text');
  });
  it('can parse a manifest containing an extended schema', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
        normative
          Text value
      schema Bar extends Foo`);
    assert.equal(manifest.schemas.Bar.normative.value, 'Text');
  });
  it('can resolve recipes with connections between particles', async () => {
    let manifest = await Manifest.parse(`
      recipe Connected
        P1
          x -> P2
        P2
          y -> P1.y`);
    let recipe = manifest.recipes[0];
    assert(recipe);
    assert.equal(recipe.views.length, 2);
    assert.equal(recipe.viewConnections.length, 4);
  });
  it('supports recipies specified with bidirectional connections', async () => {
    let manifest = await Manifest.parse(`
      recipe Bidirectional
        P1
          x -> P2.x
        P2
          x -> P1.x`);
    let recipe = manifest.recipes[0];
    assert(recipe);
    assert.equal(recipe.views.length, 1);
    assert.equal(recipe.viewConnections.length, 2);
    assert.equal(recipe.toString(), `recipe
  map as view0
  P1 as particle0
    x -> view0
  P2 as particle1
    x -> view0`);
  });
  it('supports recipes with constraints', async () => {
    let manifest = await Manifest.parse(`
      recipe Constrained
        A.a -> B.b`);
    let recipe = manifest.recipes[0];
    assert(recipe);
    assert.equal(recipe._connectionConstraints.length, 1);
    var constraint = recipe._connectionConstraints[0];
    assert.equal(constraint.fromParticle, 'A');
    assert.equal(constraint.fromConnection, 'a');
    assert.equal(constraint.toParticle, 'B');
    assert.equal(constraint.toConnection, 'b');
  })
  it('supports recipes with local names', async () => {
    await assertRecipeParses(
      `recipe
        map #things as thingView
        P1 as p1
          x -> thingView
        P2
          x -> thingView
          y -> p1.y`,
      `recipe
        map #things as thingView
        map as view0
        P1 as p1
          x -> thingView
          y = view0
        P2 as particle0
          x -> thingView
          y -> view0`);
  });
  // TODO: move these tests to new-recipe tests.
  it('can normalize simple recipes', async () => {
    let manifest = await Manifest.parse(`
      recipe
        map as v1
        P1
          x -> v1
        P2
      recipe
        map as someView
        P2
        P1
          x -> someView
        `);
    let [recipe1, recipe2] = manifest.recipes;
    assert.notEqual(recipe1.toString(), recipe2.toString());
    assert.notEqual(await recipe1.digest(), await recipe2.digest());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
    assert.equal(await recipe1.digest(), await recipe2.digest());
  });
  it('can normalize recipes with interdependent ordering of views and particles', async () => {
    let manifest = await Manifest.parse(`
      recipe
        map as v1
        map as v2
        P1
          x -> v1
        P1
          x -> v2
      recipe
        map as v1
        map as v2
        P1
          x -> v2
        P1
          x -> v1`);
    let [recipe1, recipe2] = manifest.recipes;
    assert.notEqual(recipe1.toString(), recipe2.toString());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
  });
  it('can resolve recipe particles defined in the same manifest', async () => {
    let manifest = await Manifest.parse(`
      particle Thing in 'thing.js'
        Thing(in [Something] someThings, out [Someother] someOthers)
      recipe
        Thing`);
    assert(manifest.recipes[0].particles[0].spec);
  });
  it('can load a manifest via a loader', async () => {
    let registry = {};
    let loader = {loadFile() { return 'recipe'; }};
    let manifest = await Manifest.load('some-path', loader, registry);
    assert(manifest.recipes[0]);
    assert.equal(manifest, registry['some-path']);
  })
  it('can load a manifest with imports', async () => {
    let registry = {};
    let loader = {loadFile(path) {
      return {
        a: `import 'b'`,
        b: `recipe`,
      }[path];
    }}
    let manifest = await Manifest.load('a', loader, registry);
    assert.equal(registry.a, manifest);
    assert.equal(manifest.imports[0], registry.b);
  });
  it('can resolve recipe particles imported from another manifest', async () => {
    let registry = {};
    let loader = {
      loadFile(path) {
        return {
          a: `
              import 'b'
              recipe
                ParticleB
                `,
          b: `
              particle ParticleB in 'b.js'
                ParticleB(in Thing)`
        }[path];
      }
    };
    let manifest = await Manifest.load('a', loader, registry);
    assert.equal(manifest.recipes[0].particles[0].spec, registry.b.particles.ParticleB);
  });
  it('can parse a schema extending a schema in another manifest', async () => {
    let registry = {};
    let loader = {
      loadFile(path) {
        return {
          a: `
              import 'b'
              schema Bar extends Foo`,
          b: `
              schema Foo
                normative
                  Text value`
        }[path];
      }
    };
    let manifest = await Manifest.load('a', loader, registry);
    assert.equal(manifest.schemas.Bar.normative.value, 'Text');
  });
});
