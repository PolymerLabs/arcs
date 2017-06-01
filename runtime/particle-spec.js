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
var typeLiteral = require("./type-literal.js");

class ConnectionSpec {
  constructor(rawData, typeVarMap) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.typeName = rawData.type;
    this.typeName = typeLiteral.convertNamedVariablesToVariables(this.typeName, typeVarMap);
    this.type = new runtime.internals.Type(this.typeName);
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
    this.name = rawData.name;
    var typeVarMap = new Map();
    this.connections = this.rawData.args.map(a => new ConnectionSpec(a, typeVarMap));
    this.connectionMap = new Map();
    this.connections.forEach(a => this.connectionMap.set(a.name, a));
    this.inputs = this.connections.filter(a => a.isInput);
    this.outputs = this.connections.filter(a => a.isOutput);
    this.exposes = rawData.exposes;
    this.renders = rawData.renders;
    this.transient = rawData.transient;
    this.description = rawData.description;
  }

  resolve() {
    let result = new ParticleSpec(this.rawData);
    // FIXME: do we need this now?
    return result;
  }

  buildRecipe() {
    var builder = new recipe.RecipeBuilder();
    builder.addParticle(this.name);
    this.connections.forEach(connection => builder.connectSpec(connection.name, connection));
    return builder.build();
  }
}

module.exports = ParticleSpec;
