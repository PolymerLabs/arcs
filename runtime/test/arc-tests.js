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

const Arc = require("../arc.js");
const assert = require('chai').assert;
const SlotComposer = require('../slot-composer.js');
const util = require('./test-util.js');
const viewlet = require('../viewlet.js');
const Manifest = require('../manifest.js');


let loader = new (require('../loader'));

async function setup() {
  let manifest = await Manifest.load('../particles/test/test-particles.manifest', loader);
  return {
    TestParticle: manifest.findParticleByName('TestParticle'),
    Foo: manifest.findSchemaByName('Foo').entityClass(),
    Bar: manifest.findSchemaByName('Bar').entityClass(),
  }
}
const slotComposer = new SlotComposer({});

describe('Arc', function() {
  it('applies existing views to a particle', async () => {
    let {TestParticle, Foo, Bar} = await setup();
    let arc = new Arc({loader, slotComposer});
    let fooView = arc.createView(Foo.type);
    viewlet.viewletFor(fooView).set(new Foo({value: 'a Foo'}));
    let barView = arc.createView(Bar.type);
    var particle = arc.instantiateParticle(TestParticle);
    arc.connectParticleToView(particle, {particle, fooView}, 'foo', fooView);
    arc.connectParticleToView(particle, {particle, barView}, 'bar', barView);
    await util.assertSingletonHas(barView, Bar, "a Foo1");
  });

  it('applies new views to a particle', async () => {
    let {TestParticle, Foo, Bar} = await setup();
    let arc = new Arc({loader, slotComposer});
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);
    var particle = arc.instantiateParticle(TestParticle);
    arc.connectParticleToView(particle, {particle, fooView}, 'foo', fooView);
    arc.connectParticleToView(particle, {particle, barView}, 'bar', barView);
    viewlet.viewletFor(fooView).set(new Foo({value: 'a Foo'}));
    await util.assertSingletonHas(barView, Bar, "a Foo1");
  });
});
