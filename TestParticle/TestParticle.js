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

var Particle = require("../runtime/particle.js").Particle;
var data = require("../runtime/data-layer.js");

var Bar = data.testing.testEntityClass("Bar");

class TestParticle extends Particle {

  dataUpdated() {
    this.bar = new Bar(this.foo.data + 1);
    this.commitData();
  }
}

exports.TestParticle = TestParticle;
