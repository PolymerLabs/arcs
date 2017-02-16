/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict"

var coordinator = require("./coordinator.js");
var particles = require("./particle.js").particles;
var loader = require("./load-particle.js");

class Arc {
  constructor() {
    this.coordinator = new coordinator.Coordinator();
  }

  addView(view) {
    // TODO:
    // assert(view.arc == undefined);
    view.arc = this;
    this.coordinator.addView(view);
  }

  // TODO: implement me
  // suggest some particles & bindings based on .. stuff
  suggestinate() {

  }

  load() {
    var suggestions = this.suggestinate();
    // TODO: need some way of recording & applying suggested views too?
    // viewFor may go away in the long run.
    for (var suggestion of suggestions)
      loader.loadParticle(suggestion.name, this.coordinator);

  }

  tick() {
    this.coordinator.tick();
  }
}

exports.Arc = Arc;
