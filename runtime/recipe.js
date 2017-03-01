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
var data = require("./data-layer.js");

class Connection {
  constructor(name, viewOrType) {
    this.name = name;
    if (viewOrType instanceof data.internals.View) {
      this.view = viewOrType;
      this.type = viewOrType.type;
    } else {
      this.type = viewOrType;
    }
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

class Recipe {
  constructor(...suggestions) {
    this.suggestions = suggestions;
  }
}

class RecipeBuilder {
  constructor() {
    this.suggestions = [];
    this.currentSuggestion = undefined;
  }
  suggest(particleName) {
    if (this.currentSuggestion !== undefined) {
      this.suggestions.push(new Suggestion(this.currentSuggestion.name, this.currentSuggestion.connections));
    }
    this.currentSuggestion = {name: particleName, connections: []};
    return this;
  }
  connect(name, view) {
    this.currentSuggestion.connections.push(new Connection(name, view));
    return this;
  }
  build() {
    if (this.currentSuggestion !== undefined) {
      this.suggestions.push(new Suggestion(this.currentSuggestion.name, this.currentSuggestion.connections));
    }
    return new Recipe(...this.suggestions)  
  }
}

module.exports = { Recipe, Suggestion, Connection, RecipeBuilder }
