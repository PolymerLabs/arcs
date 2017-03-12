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

var Loader = require("./loader.js"); 
var runtime = require("./runtime.js");

class Connection {
  constructor(name, viewOrSpec) {
    this.name = name;

    if (viewOrSpec instanceof runtime.internals.View) {
      this.view = viewOrSpec;
      this.type = viewOrSpec.type;
    } else {
      this.spec = viewOrSpec;
    }
  }
}

class RecipeComponent {
  constructor(particleName, connections) {
    this.particleName = particleName;
    this.connections = connections;
  }

  instantiate(arc) {
    var particle = Loader.loadParticle(this.particleName, arc);
    for (var connection of this.connections) {
      var slot = particle.inputs.get(connection.name);
      if (!slot)
        slot = particle.outputs.get(connection.name);
      if (typeof connection.view == 'function')
        connection.view = connection.view();
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
  addParticle(particleName) {
    if (this.currentComponent !== undefined) {
      this.components.push(new RecipeComponent(this.currentComponent.name, this.currentComponent.connections));
    }
    this.currentComponent = {name: particleName, connections: []};
    return this;
  }
  connect(name, viewOrSpec) {
    this.currentComponent.connections.push(new Connection(name, viewOrSpec));
    return this;
  }
  build() {
    if (this.currentComponent !== undefined) {
      this.components.push(new RecipeComponent(this.currentComponent.name, this.currentComponent.connections));
    }
    return new Recipe(...this.components)  
  }
}

Object.assign(module.exports, { Recipe, RecipeComponent, Connection, RecipeBuilder });
