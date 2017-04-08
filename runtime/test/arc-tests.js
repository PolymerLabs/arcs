/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 "use strict";

var loader = require("../loader.js");
var runtime = require("../runtime.js");
var Arc = require("../arc.js");
let assert = require('chai').assert;
let particles = require('./test-particles.js');
let view = require('../view.js');
let util = require('./test-util.js');
let testEntities = require('./test-entities.js');
let viewlet = require('../viewlet.js');

let scope = new runtime.Scope();
testEntities.register(scope);

describe('Arc', function() {

  it('applies existing runtime to a particle', async () => {
    let arc = new Arc(scope);
    let fooView = arc.createView(scope.typeFor(testEntities.Foo));
    viewlet.viewletFor(fooView).set(new testEntities.Foo('a Foo'));
    let barView = arc.createView(scope.typeFor(testEntities.Bar));
    var particle = arc.constructParticle(particles.TestParticle);
    arc.connectParticleToView(particle, 'foo', fooView);
    arc.connectParticleToView(particle, 'bar', barView);
    await util.assertSingletonHas(barView, "a Foo1");
  });

  it('applies new runtime to a particle', async () => {
    let arc = new Arc(scope);
    let fooView = arc.createView(scope.typeFor(testEntities.Foo));
    let barView = arc.createView(scope.typeFor(testEntities.Bar));
    var particle = arc.constructParticle(particles.TestParticle);
    arc.connectParticleToView(particle, 'foo', fooView);
    arc.connectParticleToView(particle, 'bar', barView);
    viewlet.viewletFor(fooView).set(new testEntities.Foo('a Foo'));
    await util.assertSingletonHas(barView, "a Foo1");
  });

  it('works with inline particle definitions', async () => {
    let arc = new Arc(scope);
    let particleClass = require('../particle').define('P(in Foo foo, out Bar bar)', (views) => {
      views.get("bar").set(new testEntities.Bar(123));
      return 5;
    });

    let fooView = arc.createView(scope.typeFor(testEntities.Foo));
    viewlet.viewletFor(fooView).set(new testEntities.Foo(1));
    let barView = arc.createView(scope.typeFor(testEntities.Bar));
    let instance = arc.constructParticle(particleClass);
    arc.connectParticleToView(instance, 'foo', fooView);
    arc.connectParticleToView(instance, 'bar', barView);
    await util.assertSingletonHas(barView, 123);
  });

});
