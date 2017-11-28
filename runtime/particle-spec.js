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
const {ParticleDescription, ConnectionDescription} = require("./description.js");
const Type = require("./type.js");
const assert = require("assert");

class ConnectionSpec {
  constructor(rawData, typeVarMap) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.type = rawData.type.assignVariableIds(typeVarMap);
    this.isOptional = rawData.isOptional;
  }

  get isInput() {
    // TODO: we probably don't really want host to be here.
    return this.direction == "in" || this.direction == "inout" || this.direction == "host";
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
    this._model = model;
    this.name = model.name;
    this.verbs = model.verbs;
    var typeVarMap = new Map();
    this.connections = model.args.map(a => new ConnectionSpec(a, typeVarMap));
    this.connectionMap = new Map();
    this.connections.forEach(a => this.connectionMap.set(a.name, a));
    this.inputs = this.connections.filter(a => a.isInput);
    this.outputs = this.connections.filter(a => a.isOutput);
    this.transient = model.transient;

    // initialize descriptions.
    model.description = model.description || {};
    this.validateDescription(model.description);
    this.description = new ParticleDescription(model.description["pattern"], this);
    this.connections.forEach(connectionSpec => {
      connectionSpec.description = new ConnectionDescription(model.description[connectionSpec.name], this, connectionSpec);
    });

    this.implFile = model.implFile;
    this.affordance = model.affordance;
    this.slots = new Map();
    if (model.slots)
      model.slots.forEach(s => this.slots.set(s.name, new SlotSpec(s)));
    // Verify provided slots use valid view connection names.
    this.slots.forEach(slot => {
      slot.providedSlots.forEach(ps => {
        ps.views.forEach(v => assert(this.connectionMap.has(v), "Cannot provide slot for nonexistent view constraint ", v));
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

  get primaryVerb() {
    if (this.verbs.length > 0) {
      return this.verbs[0];
    }
  }

  matchAffordance(affordance) {
    return this.slots.size <= 0 || this.affordance.includes(affordance);
  }

  toLiteral() {
    let {args, name, verbs, transient, description, implFile, affordance, slots} = this._model;
    args = args.map(a => {
      let {type, direction, name} = a;
      type = type.toLiteral();
      return {type, direction, name};
    });
    return {args, name, verbs, transient, description, implFile, affordance, slots};
  }

  static fromLiteral(literal) {
    literal.args.forEach(a => a.type = Type.fromLiteral(a.type));
    return new ParticleSpec(literal);
  }

  validateDescription(description) {
    Object.keys(description || []).forEach(d => {
      assert(['kind', 'location', 'pattern'].includes(d) || this.connectionMap.has(d), `Unexpected description for ${d}`);
    });
  }

  toString() {
    let results = [];
    results.push(`particle ${this.name} in '${this.implFile}'`);
    let connRes = this.connections.map(cs => `${cs.direction} ${cs.type.toString()}${cs.isOptional ? '?' : ''} ${cs.name}`);
    results.push(`  ${this.primaryVerb}(${connRes.join(', ')})`);
    this.affordance.filter(a => a != 'mock').forEach(a => results.push(`  affordance ${a}`));
    // TODO: support form factors
    this.slots.forEach(s => {
    results.push(`  ${s.isRequired ? 'must ' : ''}consume ${s.isSet ? 'set of ' : ''}${s.name}`);
      s.providedSlots.forEach(ps => {
        results.push(`    provide ${ps.isSet ? 'set of ' : ''}${ps.name}`)
        // TODO: support form factors
        ps.views.forEach(psv => results.push(`      view ${psv}`))
      });
    });
    // Description
    if (this.description.hasPattern()) {
      results.push(`  description \`${this.description.pattern}\``);
      this.connections.forEach(cs => {
        if (cs.description.hasPattern()) {
          results.push(`    ${cs.name} \`${cs.description.pattern}\``);
        }
      });
    }
    return results.join('\n');
  }

  toManifestString() {
    return this.toString();
  }
}

module.exports = ParticleSpec;
