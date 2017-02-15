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
var coordinator = require("../coordinator.js");
let assert = require('chai').assert;

describe('Coordinator', function() {

  beforeEach(function() { data.trash(); });

  it('applies existing data to a particle', function() {
    var coord = new coordinator.Coordinator();
    data.viewFor("Foo").store("a Foo");
    var particle = loader.loadParticle("TestParticle", coord);
    coord.tick();
    assert.equal(data.viewFor("Bar").data.length, 1);
    assert.equal(data.viewFor("Bar").data[0], "a Foo1");
  });

  it('applies new data to a particle', function() {
    var coord = new coordinator.Coordinator();
    var particle = loader.loadParticle("TestParticle", coord);
    data.viewFor("Foo").store("not a Bar");
    coord.tick();
    assert.equal(data.viewFor("Bar").data.length, 1);
    assert.equal(data.viewFor("Bar").data[0], "not a Bar1");
  });

  it('applies two preloaded inputs combinatorially', function() {
    var coord = new coordinator.Coordinator();
    ['a', 'b', 'c'].map(a => data.viewFor("Foo").store(a));
    ['x', 'y', 'z'].map(a => data.viewFor("Bar").store(a));
    var particle = loader.loadParticle("TwoInputTestParticle", coord);
    coord.tick();
    assert.equal(data.viewFor("Far").data.length, 9);
    assert.deepEqual(data.viewFor("Far").data, ['a x', 'a y', 'a z', 'b x', 'b y', 'b z', 'c x', 'c y', 'c z']);
  });

  it('applies a new input to a preloaded input combinatorially', function() {
    var coord = new coordinator.Coordinator();
    ['a', 'b', 'c'].map(a => data.viewFor("Foo").store(a));
    var particle = loader.loadParticle("TwoInputTestParticle", coord);
    coord.tick();
    assert.equal(data.viewFor("Far").data.length, 0);
    ['x', 'y', 'z'].map(a => data.viewFor("Bar").store(a));
    coord.tick();
    assert.equal(data.viewFor("Far").data.length, 9);
  });

});
