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

var loader = require("./load-particle.js"); 

class Suggestion {
  constructor(particleName, connections) {
    this.particleName = particleName;
    this.connections = connections;
  }

  instantiate(arc) {
    loader(this.particleName, arc);
  }
}

class Suggestinator {
  constructor() {
  }

  // TODO: implement me!
  suggestinate(arc) {

  }
