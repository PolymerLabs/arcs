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
var runtime = require("../runtime.js");
let assert = require('chai').assert;
let particles = require('../system-particles.js');
let testParticles = require('./test-particles.js');

var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');
var Far = runtime.testing.testEntityClass('Far');

describe.skip('system particles', function() {
  it('can load the system particles', function() {
    var arc = new Arc(new runtime.Scope());
    particles.register(arc.scope);
    testParticles.register(arc.scope);
    var particle = arc.scope.instantiateParticle("Demuxer", arc);
    arc.scope.resolve(particle.outputs.get("singleton").type, arc.scope.typeFor(Foo));
    particle.autoconnect();
    var particle2 = arc.scope.instantiateParticle("TestParticle", arc);
    particle2.autoconnect();
    arc.scope.commit([new Foo("1"), new Foo("2")]);
    arc.tick();
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, arc.scope).data.data, "11");
    arc.tick();
    assert.equal(arc.tick(), false);
    assert.equal(runtime.testing.viewFor(Bar, arc.scope).data.data, "21");
  });

  it('muxer2 combinatorially demuxes', function() {
    var arc = new Arc(new runtime.Scope());
    var particle = new particles.Demuxer2(arc).arcParticle;
    arc.scope.resolve(particle.outputs.get("singleton1").type, arc.scope.typeFor(Foo));
    arc.scope.resolve(particle.outputs.get("singleton2").type, arc.scope.typeFor(Bar));
    particle.autoconnect();
    var particle2 = new testParticles.TwoInputTestParticle(arc).arcParticle;
    particle2.autoconnect();
    arc.scope.commit([new Foo("1"), new Foo("2"), new Foo("3"), new Bar("a"), new Bar("b"), new Bar("c")]);
    arc.tick();
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "1 a");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "1 b");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "1 c");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "2 a");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "2 b");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "2 c");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "3 a");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "3 b");
    arc.tick();
    assert.equal(runtime.testing.viewFor(Far, arc.scope).data.data, "3 c");
  });
});