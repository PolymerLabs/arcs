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
var Coordinator = require("../coordinator.js");
let assert = require('chai').assert;

describe('particle loader', function() {
  it('can load a particle', function() {
    var coord = new Coordinator();
    var particle = loader.loadParticle("TestParticle", coord);
    assert.isNotNull(particle);
  });
});
