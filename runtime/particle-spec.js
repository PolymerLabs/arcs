/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Type from './type.js';
import TypeChecker from './recipe/type-checker.js';
import Shape from './shape.js';
import assert from '../platform/assert-web.js';

class ConnectionSpec {
  constructor(rawData, typeVarMap) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.type = rawData.type.mergeTypeVariablesByName(typeVarMap);
    this.isOptional = rawData.isOptional;
    this.dependentConnections = [];
  }

  instantiateDependentConnections(particle, typeVarMap) {
    for (let dependentArg of this.rawData.dependentConnections) {
      dependentArg.type = dependentArg.type.model;
      let dependentConnection = particle.createConnection(dependentArg, typeVarMap);
      dependentConnection.parentConnection = this;
      this.dependentConnections.push(dependentConnection);
    }

  }

  get isInput() {
    // TODO: we probably don't really want host to be here.
    return this.direction == 'in' || this.direction == 'inout' || this.direction == 'host';
  }

  get isOutput() {
    return this.direction == 'out' || this.direction == 'inout';
  }

  isCompatibleType(type) {
    return TypeChecker.compareTypes({type}, {type: this.type, direction: this.direction});
  }
}

class SlotSpec {
  constructor(slotModel) {
    this.name = slotModel.name;
    this.isRequired = slotModel.isRequired;
    this.isSet = slotModel.isSet;
    this.tags = slotModel.tags || [];
    this.formFactor = slotModel.formFactor; // TODO: deprecate form factors?
    this.providedSlots = [];
    if (!slotModel.providedSlots)
      return;
    slotModel.providedSlots.forEach(ps => {
      this.providedSlots.push(new ProvidedSlotSpec(ps.name, ps.isSet, ps.tags, ps.formFactor, ps.handles));
    });
  }

  getProvidedSlotSpec(name) {
    return this.providedSlots.find(ps => ps.name == name);
  }
}

class ProvidedSlotSpec {
  constructor(name, isSet, tags, formFactor, handles) {
    this.name = name;
    this.isSet = isSet;
    this.tags = tags || [];
    this.formFactor = formFactor; // TODO: deprecate form factors?
    this.handles = handles || [];
  }
}

class ParticleSpec {
  constructor(model) {
    this._model = model;
    this.name = model.name;
    this.verbs = model.verbs;
    let typeVarMap = new Map();
    this.connections = [];
    model.args.forEach(arg => this.createConnection(arg, typeVarMap));
    this.connectionMap = new Map();
    this.connections.forEach(a => this.connectionMap.set(a.name, a));
    this.inputs = this.connections.filter(a => a.isInput);
    this.outputs = this.connections.filter(a => a.isOutput);

    // initialize descriptions patterns.
    model.description = model.description || {};
    this.validateDescription(model.description);
    this.pattern = model.description['pattern'];
    this.connections.forEach(connectionSpec => {
      connectionSpec.pattern = model.description[connectionSpec.name];
    });

    this.implFile = model.implFile;
    this.affordance = model.affordance;
    this.slots = new Map();
    if (model.slots)
      model.slots.forEach(s => this.slots.set(s.name, new SlotSpec(s)));
    // Verify provided slots use valid view connection names.
    this.slots.forEach(slot => {
      slot.providedSlots.forEach(ps => {
        ps.handles.forEach(v => assert(this.connectionMap.has(v), 'Cannot provide slot for nonexistent view constraint ', v));
      });
    });
  }

  createConnection(arg, typeVarMap) {
    let connection = new ConnectionSpec(arg, typeVarMap);
    this.connections.push(connection);
    connection.instantiateDependentConnections(this, typeVarMap);
    return connection;
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
    let {args, name, verbs, description, implFile, affordance, slots} = this._model;
    let connectionToLiteral = ({type, direction, name, isOptional, dependentConnections}) => ({type: type.toLiteral(), direction, name, isOptional, dependentConnections: dependentConnections.map(connectionToLiteral)});
    args = args.map(a => connectionToLiteral(a));
    return {args, name, verbs, description, implFile, affordance, slots};
  }

  static fromLiteral(literal) {
    let {args, name, verbs, description, implFile, affordance, slots} = literal;
    let connectionFromLiteral = ({type, direction, name, isOptional, dependentConnections}) => ({type: Type.fromLiteral(type), direction, name, isOptional, dependentConnections: dependentConnections.map(connectionFromLiteral)}); 
    args = args.map(connectionFromLiteral);
    return new ParticleSpec({args, name, verbs, description, implFile, affordance, slots});
  }

  clone() {
    return ParticleSpec.fromLiteral(this.toLiteral());
  }

  equals(other) {
    return JSON.stringify(this.toLiteral()) === JSON.stringify(other.toLiteral());
  }

  validateDescription(description) {
    Object.keys(description || []).forEach(d => {
      assert(['kind', 'location', 'pattern'].includes(d) || this.connectionMap.has(d), `Unexpected description for ${d}`);
    });
  }

  toInterface() {
    return Type.newInterface(this._toShape());
  }

  _toShape() {
    const handles = this._model.args;
    // TODO: wat do?
    assert(!this.slots.length, 'please implement slots toShape');
    const slots = [];
    return new Shape(handles, slots);
  }

  toString() {
    let results = [];
    let verbs = this.verbs.map(verb => `#${verb}`).join(' ');
    results.push(`particle ${this.name} in '${this.implFile}' ${verbs}`.trim());
    for (let connection of this.connections)
      results.push(`  ${connection.direction} ${connection.type.toString()}${connection.isOptional ? '?' : ''} ${connection.name}`);
    this.affordance.filter(a => a != 'mock').forEach(a => results.push(`  affordance ${a}`));
    // TODO: support form factors
    this.slots.forEach(s => {
      // Consume slot.
      let consume = [];
      if (s.isRequired) {
        consume.push('must');
      }
      consume.push('consume');
      if (s.isSet) {
        consume.push('set of');
      }
      consume.push(s.name);
      if (s.tags.length > 0) {
        consume.push(s.tags.join(' '));
      }
      results.push(`  ${consume.join(' ')}`);
      if (s.formFactor) {
        results.push(`    formFactor ${s.formFactor}`);
      }
      // Provided slots.
      s.providedSlots.forEach(ps => {
        let provide = ['provide'];
        if (ps.isSet) {
          provide.push('set of');
        }
        provide.push(ps.name);
        if (ps.tags.length > 0) {
          provide.push(ps.tags.join(' '));
        }
        results.push(`    ${provide.join(' ')}`);
        if (ps.formFactor) {
          results.push(`      formFactor ${ps.formFactor}`);
        }
        ps.handles.forEach(psv => results.push(`      view ${psv}`));
      });
    });
    // Description
    if (this.pattern) {
      results.push(`  description \`${this.pattern}\``);
      this.connections.forEach(cs => {
        if (cs.pattern) {
          results.push(`    ${cs.name} \`${cs.pattern}\``);
        }
      });
    }
    return results.join('\n');
  }

  toManifestString() {
    return this.toString();
  }
}

export default ParticleSpec;
