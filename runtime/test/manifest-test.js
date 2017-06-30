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

function assertRecipeParses(input, result) {
  // Strip common leading whitespace.
  //result = result.replace(new Regex(`()^|\n)${result.match(/^ */)[0]}`), '$1'),
  let target = Manifest.parse(result).recipes[0].toString();
  assert.deepEqual(Manifest.parse(input).recipes[0].toString(), target);
}

describe('manifest', function() {
  it('can parse a manifest containing a recipe', () => {
    let manifest = Manifest.parse(`
      recipe SomeRecipe
        map #someView
        SomeParticle
          someParam -> #tag`);
    let recipe = manifest.recipes[0];
    assert(recipe);
    assert.equal(recipe.particles.length, 1);
    assert.equal(recipe.views.length, 1);
    assert.equal(recipe.viewConnections.length, 1);
    assert.sameMembers(recipe.viewConnections[0].tags, ['#tag'])
  })
  it('can resolve recipes with connections between particles', () => {
    let manifest = Manifest.parse(`
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
  it('supports recipies specified with bidirectional connections', () => {
    let manifest = Manifest.parse(`
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
  it('supports recipes with local names', () => {
    assertRecipeParses(
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
});
