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
let assert = require('chai').assert;


var Foo = data.testing.testEntityClass('Foo');
var Bar = data.testing.testEntityClass('Bar');

describe('resolver', function() {
  beforeEach(function() { data.testing.trash(); });

  it('can resolve a partially constructed recipe', function() {
    var arc = new Arc();
    var suggestion = new recipe.RecipeBuilder()
        .suggest("TestParticle")
            .connect("foo", Foo.type)
            .connect("bar", Bar.type)
        .build();
    var resolver = new Resolver();
    resolver.resolve(suggestion);
    suggestion.instantiate(arc);
    data.internals.viewFor(Foo.type).store(new Foo("not a Bar"));
    arc.tick();
    assert.equal(data.internals.viewFor(Bar.type).data.length, 1);
    assert.equal(data.internals.viewFor(Bar.type).data[0].data, "not a Bar1");
  });
});