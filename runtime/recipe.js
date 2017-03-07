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

class RecipeComponent {
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
  constructor(...components) {
    this.components = components;
  }

  instantiate(arc) {
    this.components.forEach(component => component.instantiate(arc));
  }
}

class RecipeBuilder {
  constructor() {
    this.components = [];
    this.currentComponent = undefined;
  }
  suggest(particleName) {
    if (this.currentComponent !== undefined) {
      this.components.push(new RecipeComponent(this.currentComponent.name, this.currentComponent.connections));
    }
    this.currentComponent = {name: particleName, connections: []};
    return this;
  }
  connect(name, view) {
    this.currentComponent.connections.push(new Connection(name, view));
    return this;
  }
  build() {
    if (this.currentComponent !== undefined) {
      this.components.push(new RecipeComponent(this.currentComponent.name, this.currentComponent.connections));
    }
    return new Recipe(...this.components)  
  }
}

module.exports = { Recipe, RecipeComponent, Connection, RecipeBuilder }
