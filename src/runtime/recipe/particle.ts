// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {SlotConnection} from './slot-connection.js';
import {HandleConnection} from './handle-connection.js';
import {compareComparables, compareStrings, compareArrays} from './util.js';
import {Recipe} from './recipe.js';
import {ParticleSpec} from '../particle-spec.js';

export class Particle {
  private readonly _recipe: Recipe;
  private _id: string | undefined = undefined;
  private _name: string;
  private _localName: string | undefined = undefined;
  private _spec: ParticleSpec | undefined = undefined;
  private _verbs: string[] = [];
  private _connections: {[index: string]: HandleConnection} = {};
  
  // TODO: replace with constraint connections on the recipe
  _unnamedConnections: HandleConnection[] = [];

  // map of consumed Slot connections by slot name.
  _consumedSlotConnections: {[index: string]: SlotConnection} = {};

  constructor(recipe: Recipe, name: string) {
    assert(recipe);
    this._recipe = recipe;
    this._name = name;
  }

  _copyInto(recipe: Recipe, cloneMap) {
    const particle = recipe.newParticle(this._name);
    particle._id = this._id;
    particle._verbs = [...this._verbs];
    particle._spec = this._spec;

    Object.keys(this._connections).forEach(key => {
      particle._connections[key] = this._connections[key]._clone(particle, cloneMap);
    });
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection._clone(particle, cloneMap));
    particle._cloneConnectionRawTypes();
    Object.keys(this._consumedSlotConnections).forEach(key => {
      particle._consumedSlotConnections[key] = this._consumedSlotConnections[key]._clone(particle, cloneMap);
    });

    return particle;
  }

  _cloneConnectionRawTypes() {
    // TODO(shans): evaluate whether this is the appropriate context root for cloneWithResolution
    const map = new Map();
    for (const connection of Object.values(this._connections)) {
      if (connection.rawType) {
        connection._rawType = connection.rawType._cloneWithResolutions(map);
      }
    }
    for (const connection of this._unnamedConnections) {
      if (connection.rawType) {
        connection._rawType = connection.rawType._cloneWithResolutions(map);
      }
    }
  }

  _startNormalize() {
    this._localName = null;
    this._verbs.sort();
    const normalizedConnections = {};
    for (const key of (Object.keys(this._connections).sort())) {
      normalizedConnections[key] = this._connections[key];
    }
    this._connections = normalizedConnections;

    const normalizedSlotConnections = {};
    for (const key of (Object.keys(this._consumedSlotConnections).sort())) {
      normalizedSlotConnections[key] = this._consumedSlotConnections[key];
    }
    this._consumedSlotConnections = normalizedSlotConnections;
  }

  _finishNormalize() {
    this._unnamedConnections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this._id, other._id)) !== 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) !== 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) !== 0) return cmp;
    // TODO: spec?
    if ((cmp = compareArrays(this._verbs, other._verbs, compareStrings)) !== 0) return cmp;
    // TODO: slots
    return 0;
  }

  _isValid(options) {
    if (!this.spec) {
      return true;
    }
    if (!this.name && !this.primaryVerb) {
      // Must have either name of a verb
      if (options && options.errors) {
        options.errors.set(this, `Particle has no name and no verb`);
      }
      return false;
    }
    // TODO: What
    return true;
  }

  isResolved(options = undefined) {
    assert(Object.isFrozen(this));
    const consumedSlotConnections = Object.values(this.consumedSlotConnections);
    if (consumedSlotConnections.length > 0) {
      const fulfilledSlotConnections = consumedSlotConnections.filter(connection => connection.targetSlot !== undefined);
      if (fulfilledSlotConnections.length === 0) {
        if (options && options.showUnresolved) {
          options.details = 'unfullfilled slot connections';
        }
        return false;
      }
    }
    if (!this.spec) {
      if (options && options.showUnresolved) {
        options.details = 'missing spec';
      }
      return false;
    }
    if (this.spec.connectionMap.size !== Object.keys(this._connections).length) {
      if (options && options.showUnresolved) {
        options.details = 'unresolved connections';
      }
      return false;
    }
    if (this.unnamedConnections.length !== 0) {
      if (options && options.showUnresolved) {
        options.details = `${this.unnamedConnections.length} unnamed connections`;
      }
      return false;
    }
    return true;
  }

  get recipe() { return this._recipe; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get id() { return this._id; } // Not resolved until we have an ID.
  set id(id) { assert(!this._id, 'Particle ID can only be set once.'); this._id = id; }
  get name() { return this._name; }
  set name(name) { this._name = name; }
  get spec() { return this._spec; }
  get connections() { return this._connections; } // {parameter -> HandleConnection}
  get unnamedConnections() { return this._unnamedConnections; } // HandleConnection*
  get consumedSlotConnections() { return this._consumedSlotConnections; }
  get primaryVerb() { return (this._verbs.length > 0) ? this._verbs[0] : undefined; }
  set verbs(verbs) { this._verbs = verbs; }

  set spec(spec) {
    this._spec = spec;
    for (const connectionName of spec.connectionMap.keys()) {
      const speccedConnection = spec.connectionMap.get(connectionName);
      let connection = this.connections[connectionName];
      if (connection == undefined) {
        connection = this.addConnectionName(connectionName);
      }
      // TODO: don't just overwrite here, check that the types
      // are compatible if one already exists.
      connection.type = speccedConnection.type;
      connection.direction = speccedConnection.direction;
    }
    spec.slots.forEach(slotSpec => {
      if (this._consumedSlotConnections[slotSpec.name] == undefined) {
        this.addSlotConnection(slotSpec.name);
      }
      this._consumedSlotConnections[slotSpec.name].slotSpec = slotSpec;
    });
  }

  addUnnamedConnection() {
    const connection = new HandleConnection(undefined, this);
    this._unnamedConnections.push(connection);
    return connection;
  }

  addConnectionName(name) {
    assert(this._connections[name] == undefined);
    this._connections[name] = new HandleConnection(name, this);
    return this._connections[name];
  }

  allConnections() {
    return Object.values(this._connections).concat(this._unnamedConnections);
  }

  ensureConnectionName(name) {
    return this._connections[name] || this.addConnectionName(name);
  }

  getConnectionByName(name) {
    return this._connections[name];
  }

  nameConnection(connection, name) {
    assert(!this._connections[name].handle, `Connection "${name}" already has a handle`);

    const idx = this._unnamedConnections.indexOf(connection);
    assert(idx >= 0, `Cannot name '${name}' nonexistent unnamed connection.`);
    connection._name = name;

    connection.type = this._connections[name].type;
    if (connection.direction !== this._connections[name].direction) {
      assert(connection.direction === 'inout',
             `Unnamed connection cannot adjust direction ${connection.direction} to ${name}'s direction ${this._connections[name].direction}`);
      connection.direction = this._connections[name].direction;
    }

    this._connections[name] = connection;
    this._unnamedConnections.splice(idx, 1);
  }

  addSlotConnection(name) {
    const slotConn = new SlotConnection(name, this);
    this._consumedSlotConnections[name] = slotConn;
    return slotConn;
  }

  removeSlotConnection(slotConnection) {
    this._consumedSlotConnections[slotConnection._name] = null;
    slotConnection.disconnectFromSlot();
  }

  remove() {
    this.recipe.removeParticle(this);
  }

  toString(nameMap, options) {
    let result = [];
    // TODO: we need at least name or verb(s)
    if (this.name) {
      result.push(this.name);

      result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
      if (this.primaryVerb && this.primaryVerb !== this.name) {
        result.push(`// verb=${this.primaryVerb}`);
      }
    } else { // verb must exist, if there is no name.
      result.push(`&${this.primaryVerb}`);
    }
    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`// unresolved particle: ${options.details}`);
      }
    }

    result = [result.join(' ')];

    for (const connection of this.unnamedConnections) {
      result.push(connection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (const connection of Object.values(this.connections)) {
      result.push(connection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (const slotConnection of Object.values(this._consumedSlotConnections)) {
      result.push(slotConnection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    return result.join('\n');
  }
}
