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

var assert = require("assert");
var runtime = require("./runtime.js");

class RecipeViewConnection {
  constructor(name, view) {
    this.name = name;
    this.view = view;
    this.type = view.type;
  }
}


class RecipeSpecConnection {
  constructor(name, spec) {
    this.name = name;
    this.spec = spec;
  }
}

class RecipeConstraintConnection {
  constructor(name, constraintName) {
    this.name = name;
    this.constraintName = constraintName;
  }
}

class RecipeComponent {
  constructor(particleName, connections) {
    this.particleName = particleName;
    this.connections = connections;
  }

  addConnection(connection) {
    this.connections.push(connection);
  }

  instantiate(arc) {
    var particle = arc.instantiateParticle(this.particleName);
    for (var connection of this.connections) {
      assert(connection.view, 'cannot connect particle ' + this.particleName + ' to NULL view ' + connection.name);
      arc.connectParticleToView(particle, connection.name, connection.view);
    }
  }

  findConnectionByName(name) {
    for (let connection of this.connections)
      if (connection.name == name)
        return connection;
  }

  findConnectionByConstraintName(constraintName) {
    for (let connection of this.connections)
      if (connection.constraintName == constraintName)
        return connection;
  }
}

class Recipe {
  constructor(...components) {
    this.components = components;
    this.beforeInstantiation = [];
  }

  instantiate(arc) {
    this.beforeInstantiation.forEach(f => f(arc));
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
  connectSpec(name, spec) {
    this.currentComponent.connections.push(new RecipeSpecConnection(name, spec));
    return this;
  }
  connectView(name, view) {
    this.currentComponent.connections.push(new RecipeViewConnection(name, view));
    return this;
  }
  connectConstraint(name, constraintName) {
    this.currentComponent.connections.push(new RecipeConstraintConnection(name, constraintName));
    return this;
  }
  build() {
    if (this.currentComponent !== undefined) {
      this.components.push(new RecipeComponent(this.currentComponent.name, this.currentComponent.connections));
    }
    return new Recipe(...this.components)  
  }
}

Object.assign(module.exports, { Recipe, RecipeComponent, RecipeSpecConnection, RecipeViewConnection, RecipeConstraintConnection, RecipeBuilder });
