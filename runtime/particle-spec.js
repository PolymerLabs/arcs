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
var assert = require('assert');

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

class SlotSpec {
  constructor(slotModel) {
    this.name = slotModel.name;
    this.isRequired = slotModel.isRequired;
    this.formFactor = slotModel.formFactor;
    this.providedSlots = [];
    slotModel.providedSlots.forEach(ps => {
      this.providedSlots.push(new ProvidedSlotSpec(ps.name, ps.formFactor, ps.views));
    });
  }
}

class ProvidedSlotSpec {
  constructor(name, formFactor, views) {
    this.name = name;
    this.formFactor = formFactor;
    this.views = views;
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
    this.exposes = model.exposes;  // TODO: deprecate and use this.slots instead.
    this.renders = model.renders;  // TODO: deprecate and use this.slots instead.
    this.transient = model.transient;
    this.description = model.description;
    this.implFile = model.implFile;
    this.affordance = model.affordance;
    this.slots = [];
    if (model.slots)
      model.slots.forEach(s => this.slots.push(new SlotSpec(s)));
    // Verify provided slots use valid view connection names.
    this.slots.forEach(slot => {
      slot.providedSlots.forEach(ps => {
        ps.views.forEach(v => assert(this.connectionMap.has(v), 'Cannot provide slot for nonexistent view constraint ', v));
      });
    });
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
