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
var Relevance = require('../relevance.js');
var runtime = require("../runtime.js");
var SlotComposer = require('../slot-composer.js');
var viewlet = require('../viewlet.js');
var assert = require('chai').assert;
var Manifest = require('../manifest.js');
var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');
var Far = runtime.testing.testEntityClass('Far');

describe('description generator', function() {
  it.skip('generate description', async function() {
    var loader = new Loader();
    let manifest = await Manifest.load('../particles/test/test-particles.manifest', loader);
    let particles = {
      TestParticle: manifest.findParticleByName('TestParticle'),
      ListTestParticle: manifest.findParticleByName('TestParticle'),
    };
    const slotComposer = new SlotComposer({});
    var arc = new Arc({loader, slotComposer});
    var relevance = new Relevance();
    relevance.newArc = arc;
    relevance.newArc._viewMap = new Map();
    let map = new Map();
    map.set({particle : {name : "TestParticle"}}, [5]);
    relevance.apply(map);
    var fooView = arc.createView(Foo.type);
    var barView = arc.createView(Bar.type);
    var farsView = arc.createView(Far.type.viewOf());
    relevance.newArc._viewsById.forEach((view, id) => relevance.newArc._viewMap.set(view, view));

    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectConstraint("foo", "fooView")
            .connectConstraint("bar", "barView")
        .build();
    r.components[0].findConnectionByName("foo").view = fooView;
    r.components[0].findConnectionByName("bar").view = barView;
    r.arc = arc;
    // fallback to recipe description.
    r.name = "default name";
    assert.equal(r.name,  new DescriptionGenerator(r, relevance).description);

    // use particle's description pattern.
    particles.TestParticle.spec.renders = [{name : {name : "root"}}];
    loader.registerParticle(particles.TestParticle);
    assert.equal("test particle", new DescriptionGenerator(r, relevance).description);

    // resolve simple types.
    particles.TestParticle.spec.description = {pattern : "Increment ${foo} and return ${bar}"};
    loader.registerParticle(particles.TestParticle);
    assert.equal("Increment Foo and return Bar", new DescriptionGenerator(r, relevance).description);

    // resolve views with descriptions.
    particles.TestParticle.spec.description.foo = "my foo";
    particles.TestParticle.spec.description.bar = "my bar";
    loader.registerParticle(particles.TestParticle);
    let descriptionGenerator = new DescriptionGenerator(r, relevance);
    assert.equal("Increment my foo and return my bar",
                 descriptionGenerator.description);
    assert.equal("my foo", descriptionGenerator.getViewDescription("TestParticle", "foo"));

    // Combine multiple components descriptions.
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectConstraint("foo", "fooView")
            .connectConstraint("bar", "barView")
        .addParticle("ListTestParticle")
            .connectConstraint("bar", "barView")
            .connectConstraint("fars", "farsView")
        .build();
    r.components[0].findConnectionByName("foo").view = fooView;
    r.components[0].findConnectionByName("bar").view = barView;
    r.components[1].findConnectionByName("bar").view = barView;
    r.components[1].findConnectionByName("fars").view = farsView;
    r.arc = arc;
    particles.ListTestParticle.spec.renders = [{name : {name : "root"}}];
    particles.ListTestParticle.spec.description = {pattern : "Do ${fars} from ${bar}"};
    loader.registerParticle(particles.ListTestParticle);
    assert.equal("Do Far List from my bar and Increment my foo and return my bar",
                 new DescriptionGenerator(r, relevance).description);

    // Revert particle changes.
    particles.TestParticle.spec.description = null;
    particles.TestParticle.spec.renders = [];
    particles.TestParticle.spec.exposes = [];
    loader.registerParticle(particles.TestParticle);
    particles.ListTestParticle.spec.description = null;
    particles.ListTestParticle.spec.renders = [];
    particles.ListTestParticle.spec.exposes = [];
    loader.registerParticle(particles.ListTestParticle);
  });
  // TODO(mmandlis): Test description generation for template types.
});
