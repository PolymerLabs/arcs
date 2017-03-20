/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var loader = require("../loader.js");
var runtime = require("../runtime.js");
var Arc = require("../arc.js");
let assert = require('chai').assert;
let particles = require('./test-particles.js');

var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');
var Far = runtime.testing.testEntityClass('Far');

let scope = new runtime.Scope();
[Foo, Bar, Far].map(a => scope.registerEntityClass(a));

describe('Arc', function() {

  it('applies existing runtime to a particle', function() {
    let arc = new Arc(scope);
    scope.commitSingletons([new Foo('a Foo')]);
    var particle = new particles.TestParticle(arc).arcParticle;
    particle.autoconnect();
    arc.tick();
    //assert.equal(runtime.testing.viewFor(Bar, scope).data.length, 1);
    assert.equal(runtime.testing.viewFor(Bar, scope).data.data, "a Foo1");
  });

  it('applies new runtime to a particle', function() {
    let arc = new Arc(scope);
    var particle = new particles.TestParticle(arc).arcParticle;
    particle.autoconnect();
    scope.commitSingletons([new Foo("not a Bar")]);
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.data, "not a Bar1");
  });

  it('works with inline particle defintions', () => {
    let arc = new Arc(scope);
    let particleClass = require('../particle').define('P(in Foo foo, out Bar bar)', ({foo}) => {
      return {bar: new Bar(123)};
    });
    scope.commit([new Foo(1)]);
    // TODO: maybe arc.register(particleClass) => arcParticle
    let instance = new particleClass(arc);
    instance.arcParticle.autoconnect();
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.data, 123);
  });

});
