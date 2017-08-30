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
const Type = require('./type.js');
const assert = require('assert');

class ConnectionSpec {
  constructor(rawData, typeVarMap) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.type = rawData.type.assignVariableIds(typeVarMap);
  }

  get isInput() {
    return this.direction == "in" || this.direction == "inout";
  }

  get isOutput() {
    return this.direction == "out" || this.direction == "inout";
  }
}

class SlotSpec {
  constructor(slotModel) {
    this.name = slotModel.name;
    this.isRequired = slotModel.isRequired;
    this.isSet = slotModel.isSet;
    this.formFactor = slotModel.formFactor;
    this.providedSlots = [];
    slotModel.providedSlots.forEach(ps => {
      this.providedSlots.push(new ProvidedSlotSpec(ps.name, ps.isSet, ps.formFactor, ps.views));
    });
  }
}

class ProvidedSlotSpec {
  constructor(name, isSet, formFactor, views) {
    this.name = name;
    this.isSet = isSet;
    this.formFactor = formFactor;
    this.views = views;
  }
}

class ParticleSpec {
  constructor(model, resolveSchema) {
    // TODO: This should really happen after parsing, not here.
    if (model.args)
      model.args.forEach(arg => arg.type = arg.type.resolveSchemas(resolveSchema));
    else
      model.args = [];
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
    this.slots = new Map();
    if (model.slots)
      model.slots.forEach(s => this.slots.set(s.name, new SlotSpec(s)));
    // Verify provided slots use valid view connection names.
    this.slots.forEach(slot => {
      slot.providedSlots.forEach(ps => {
        ps.views.forEach(v => assert(this.connectionMap.has(v), 'Cannot provide slot for nonexistent view constraint ', v));
      });
    });
  }

  isInput(param) {
    for (let input of this.inputs) if (input.name == param) return true;
  }

  isOutput(param) {
    for (let outputs of this.outputs) if (outputs.name == param) return true;
  }

  getSlotSpec(slotName) {
    return this.slots.get(slotName);
  }

  matchAffordance(affordance) {
    return this.slots.size <= 0 || this.affordance.includes(affordance);
  }

  toLiteral() {
    let {args, name, exposes, renders, transient, description, implFile} = this._model;
    args = args.map(a => {
      let {type, direction, name} = a;
      type = type.toLiteral();
      return {type, direction, name};
    });
    return {args, name, exposes, renders, transient, description, implFile};
  }

  static fromLiteral(literal) {
    literal.args.forEach(a => a.type = Type.fromLiteral(a.type));
    return new ParticleSpec(literal, () => assert(false));
  }
}

module.exports = ParticleSpec;
