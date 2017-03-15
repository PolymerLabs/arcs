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

var runtime = require("./runtime.js");
var recipe = require("./recipe.js");

class ConnectionSpec {
  constructor(rawData) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.typeName = rawData.type;
  }

  resolve(scope) {
    this.type = new runtime.internals.Type(this.typeName, scope)
  }

  get mustCreate() {
    return this.direction == "create";
  }

  get isInput() {
    return this.direction == "in";
  }

  get isOutput() {
    return this.direction == "out" || this.direction == "create";
  }
}

class ParticleSpec {
  constructor(rawData) {
    this.rawData = rawData;
    this.type = rawData.type;
    this.connections = this.rawData.args.map(a => new ConnectionSpec(a))
    this.inputs = this.connections.filter(a => a.isInput);
    this.outputs = this.connections.filter(a => a.isOutput);
  }

  resolve(scope) {
    let result = new ParticleSpec(this.rawData);
    result.connections.forEach(connection => connection.resolve(scope));
    return result;
  }

  buildRecipe() {
    var builder = new recipe.RecipeBuilder();
    builder.addParticle(this.type);
    this.connections.forEach(connection => builder.connect(connection.name, connection));
    return builder.build();
  }
}

module.exports = ParticleSpec;
