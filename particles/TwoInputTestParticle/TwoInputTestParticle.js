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

var Particle = require("../../runtime/particle.js").Particle;
var data = require("../../runtime/data-layer.js");

var Far = data.testing.testEntityClass("Far");

class TwoInputTestParticle extends Particle {

  dataUpdated() {
    this.far = new Far(this.foo.data + ' ' + this.bar.data);
    this.commitData(3);
  }
}

module.exports = TwoInputTestParticle
