/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var data = require("../data-layer.js");
var Arc = require("../arc.js");
var Resolver = require("../resolver.js");
var recipe = require("../recipe.js");
var loader = require("../loader.js");
let assert = require('chai').assert;


var Foo = data.testing.testEntityClass('Foo');
var Bar = data.testing.testEntityClass('Bar');

describe('resolver', function() {

  it('can resolve a partially constructed recipe', function() {
    let scope = new data.Scope();
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connect("foo", "Foo")
            .connect("bar", "Bar")
        .build();
    var resolver = new Resolver();
    resolver.resolve(r, arc);
    r.instantiate(arc);
    scope.commit([new Foo("not a Bar")]);
    arc.tick();
    assert.equal(data.testing.viewFor(Bar, scope).data.length, 1);
    assert.equal(data.testing.viewFor(Bar, scope).data[0].data, "not a Bar1");
  });

  it('can resolve a recipe loaded from a .ptcl file', function() {
    let scope = new data.Scope();
    var arc = new Arc(scope);
    var r = loader.loadRecipe('TestParticle');
    var resolver = new Resolver();
    resolver.resolve(r, arc);
    r.instantiate(arc);
    scope.commit([new Foo("not a Bar")]);
    arc.tick();
    assert.equal(data.testing.viewFor(Bar, scope).data.length, 1);
    assert.equal(data.testing.viewFor(Bar, scope).data[0].data, "not a Bar1");    
  });
});
