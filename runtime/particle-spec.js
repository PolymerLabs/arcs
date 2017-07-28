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

const runtime = require("./runtime.js");
const recipe = require("./recipe.js");
const Type = require('./type.js');

class ConnectionSpec {
  constructor(rawData, typeVarMap) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    let type = Type.assignVariableIds(rawData.type, typeVarMap);
    this.type = new runtime.internals.Type(type);
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
  constructor(model, resolveSchema) {
    // TODO: This should really happen after parsing, not here.
    model.args.forEach(arg => arg.type = Type.resolveSchemas(arg.type, resolveSchema));
    this._model = model;
    this.name = model.name;
    var typeVarMap = new Map();
    this.connections = model.args.map(a => new ConnectionSpec(a, typeVarMap));
    this.connectionMap = new Map();
    this.connections.forEach(a => this.connectionMap.set(a.name, a));
    this.inputs = this.connections.filter(a => a.isInput);
    this.outputs = this.connections.filter(a => a.isOutput);
    this.exposes = model.exposes;
    this.renders = model.renders;
    this.transient = model.transient;
    this.description = model.description;
  }

  buildRecipe() {
    var builder = new recipe.RecipeBuilder();
    builder.addParticle(this.name);
    this.connections.forEach(connection => builder.connectSpec(connection.name, connection));
    return builder.build();
  }

  isInput(param) {
    for (let input of this.inputs) if (input.name == param) return true;
  }

  isOutput(param) {
    for (let outputs of this.outputs) if (outputs.name == param) return true;
  }
}

module.exports = ParticleSpec;
