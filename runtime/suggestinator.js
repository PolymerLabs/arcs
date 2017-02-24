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

class Connection {
  constructor(name, view) {
    this.name = name;
    this.view = view;
  }
}

class Suggestion {
  constructor(particleName, connections) {
    this.particleName = particleName;
    this.connections = connections;
  }

  instantiate(arc) {
    var particle = loader(this.particleName, arc);
    for (var connection of this.connections) {
      var slot = particle.inputs.get(connection.name);
      if (!slot)
        slot = particle.outputs.get(connection.name);
      slot.connect(connection.view);
    }
  }
}

class Suggestinator {
  constructor() {
  }

  // TODO: implement me!
  suggestinate(arc) {

  }

  load(arc, suggestions) {
    suggestions.forEach(suggestion => suggestion.instantiate(arc));
  }
}

Suggestinator.Suggestion = Suggestion;
Suggestinator.Connection = Connection;

module.exports = Suggestinator;
