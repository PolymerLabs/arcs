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
let particles = require('./test-particles.js');

var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');

describe('particle loader', function() {
  it('can load a particle', function() {
    var arc = new Arc(new runtime.Scope());
    [Foo, Bar].map(a => arc.scope.registerEntityClass(a));
    var particle = new particles.TestParticle(arc).arcParticle;
  });
});
