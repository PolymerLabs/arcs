/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var loader = require("../load-particle.js");
var data = require("../data-layer.js");
var Arc = require("../arc.js");
let assert = require('chai').assert;

var Foo = data.testing.testEntityClass('Foo');
var Bar = data.testing.testEntityClass('Bar');
var Far = data.testing.testEntityClass('Far');

describe('Arc', function() {

  beforeEach(function() { data.testing.trash(); });

  it('applies existing data to a particle', function() {
    var arc = new Arc();
    
    data.internals.viewFor(Foo.type).store(new Foo("a Foo"));
    var particle = loader("TestParticle", arc);
    particle.autoconnect();
    arc.tick();
    assert.equal(data.internals.viewFor(Bar.type).data.length, 1);          
    assert.equal(data.internals.viewFor(Bar.type).data[0].data, "a Foo1");
  });

  it('applies new data to a particle', function() {
    var arc = new Arc();
    var particle = loader("TestParticle", arc);
    particle.autoconnect();
    data.internals.viewFor(Foo.type).store(new Foo("not a Bar"));
    arc.tick();
    assert.equal(data.internals.viewFor(Bar.type).data.length, 1);
    assert.equal(data.internals.viewFor(Bar.type).data[0].data, "not a Bar1");
  });

  it('applies two preloaded inputs combinatorially', function() {
    var arc = new Arc();
    ['a', 'b', 'c'].map(a => data.internals.viewFor(Foo.type).store(new Foo(a)));
    ['x', 'y', 'z'].map(a => data.internals.viewFor(Bar.type).store(new Bar(a)));
    var particle = loader("TwoInputTestParticle", arc);
    particle.autoconnect();
    arc.tick();
    assert.equal(data.internals.viewFor(Far.type).data.length, 9);
    assert.deepEqual(data.internals.viewFor(Far.type).data.map(a => a.data), ['a x', 'a y', 'a z', 'b x', 'b y', 'b z', 'c x', 'c y', 'c z']);
  });

  it('applies a new input to a preloaded input combinatorially', function() {
    var arc = new Arc();
    ['a', 'b', 'c'].map(a => data.internals.viewFor(Foo.type).store(new Foo(a)));
    var particle = loader("TwoInputTestParticle", arc);
    particle.autoconnect();
    arc.tick();
    assert.equal(data.internals.viewFor(Far.type).data.length, 0);
    ['x', 'y', 'z'].map(a => data.internals.viewFor(Bar.type).store(new Bar(a)));
    arc.tick();
    assert.equal(data.internals.viewFor(Far.type).data.length, 9);
    assert.deepEqual(data.internals.viewFor(Far.type).data.map(a => a.data), ['a x', 'a y', 'a z', 'b x', 'b y', 'b z', 'c x', 'c y', 'c z']);
  });

});
