/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var Arc = require("../arc.js");
var DescriptionGenerator = require('../description-generator.js');
var Loader = require('../loader');
var particles = require('./test-particles.js');
var Relevance = require('../relevance.js');
var recipe = require("../recipe.js");
var runtime = require("../runtime.js");
var SlotComposer = require('../slot-composer.js');
var viewlet = require('../viewlet.js');
var assert = require('chai').assert;

describe('description generator', function() {
  it('generate description', function() {
    var loader = new Loader();
    const slotComposer = new SlotComposer({});
    var arc = new Arc({loader, slotComposer});
    var relevance = new Relevance();
    relevance.newArc = arc;
    let map = new Map();
    map.set({particle : {name : "TestParticle"}}, [5]);
    relevance.apply(map);
    particles.register(loader);

    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectConstraint("foo", "fooView")
            .connectConstraint("bar", "barView")
        .build();
    r.arc = arc;
    // fallback to recipe description.
    r.name = "default name";
    assert.equal(r.name,  new DescriptionGenerator(r, relevance).getDescription());

    // use particle's description pattern.
    particles.TestParticle.spec.renders = [{name : {name : "root"}}];
    loader.registerParticle(particles.TestParticle);
    assert.equal("test particle", new DescriptionGenerator(r, relevance).getDescription());

    // resolve simple types.
    particles.TestParticle.spec.description = {pattern : "Increment ${foo} and return ${bar}"};
    loader.registerParticle(particles.TestParticle);
    assert.equal("Increment Foo and return Bar",
                 new DescriptionGenerator(r, relevance).getDescription());

    // resolve views with descriptions.
    particles.TestParticle.spec.description.foo = "my foo";
    particles.TestParticle.spec.description.bar = "my bar";
    loader.registerParticle(particles.TestParticle);
    assert.equal("Increment my foo and return my bar",
                 new DescriptionGenerator(r, relevance).getDescription());

    // Combine multiple components descriptions.
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectConstraint("foo", "fooView")
            .connectConstraint("bar", "barView")
        .addParticle("ListTestParticle")
            .connectConstraint("bar", "barView")
            .connectConstraint("fars", "farsView")
        .build();
    r.arc = arc;
    particles.ListTestParticle.spec.renders = [{name : {name : "root"}}];
    particles.ListTestParticle.spec.description = {pattern : "Do ${fars} from ${bar}"};
    loader.registerParticle(particles.ListTestParticle);
    assert.equal("Do Far List from my bar and Increment my foo and return my bar",
                 new DescriptionGenerator(r, relevance).getDescription());
  });
  // TODO(mmandlis): Test description generation for template types.
});
