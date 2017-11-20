// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from 'assert';
import SlotConnection from './slot-connection.js';
import ViewConnection from './view-connection.js';
import util from './util.js';

class Particle {
  constructor(recipe, name) {
    assert(recipe);
    this._recipe = recipe;
    this._id = undefined;
    this._name = name;
    this._localName = undefined;
    this._spec = undefined;
    this._tags = [];
    this._verbs = [];

    this._connections = {};
    // TODO: replace with constraint connections on the recipe
    this._unnamedConnections = [];
    this._consumedSlotConnections = {};  // map of consumed Slot connections by slot name.
  }

  _copyInto(recipe, cloneMap) {
    var particle = recipe.newParticle(this._name);
    particle._id  = this._id;
    particle._tags = [...this._tags];
    particle._verbs = [...this._verbs];
    particle._spec = this._spec;

    Object.keys(this._connections).forEach(key => {
      particle._connections[key] = this._connections[key]._clone(particle, cloneMap);
    });
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection._clone(particle, cloneMap));
    Object.keys(this._consumedSlotConnections).forEach(key => {
      particle._consumedSlotConnections[key] = this._consumedSlotConnections[key]._clone(particle, cloneMap);
    });

    return particle;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    this._verbs.sort();
    let normalizedConnections = {};
    for (let key of (Object.keys(this._connections).sort())) {
      normalizedConnections[key] = this._connections[key];
    }
    this._connections = normalizedConnections;

    let normalizedSlotConnections = {};
    for (let key of (Object.keys(this._consumedSlotConnections).sort())) {
      normalizedSlotConnections[key] = this._consumedSlotConnections[key];
    }
    this._consumedSlotConnections = normalizedSlotConnections;
  }

  _finishNormalize() {
    this._unnamedConnections.sort(util.compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._localName, other._localName)) != 0) return cmp;
    // TODO: spec?
    if ((cmp = util.compareArrays(this._tags, other._tags, util.compareStrings)) != 0) return cmp;
    if ((cmp = util.compareArrays(this._verbs, other._verbs, util.compareStrings)) != 0) return cmp;
    // TODO: slots
    return 0;
  }

  _isValid() {
    if (!this.spec) {
      return true;
    }
    if (!this.name && !this.primaryVerb) {
      // Must have either name of a verb
      return false;
    }
    // TODO: What
    return true;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));
    // TODO: slots
    if (this.consumedSlotConnections.length > 0) {
      let fulfilledSlotConnections = this.consumedSlotConnections.filter(connection => connection.targetSlot !== undefined);
      if (fulfilledSlotConnections.length == 0) {
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
    if (this.spec.connectionMap.size != Object.keys(this._connections).length) {
      if (options && options.showUnresolved) {
        options.details = 'unresolved connections';
      }
      return false;
    }
    if (this.unnamedConnections.length != 0) {
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
  get name() { return this._name; }
  set name(name) { this._name = name; }
  get spec() { return this._spec; }
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get connections() { return this._connections; } // {parameter -> ViewConnection}
  get unnamedConnections() { return this._unnamedConnections; } // ViewConnection*
  get consumedSlotConnections() { return this._consumedSlotConnections; }
  get primaryVerb() { if (this._verbs.length > 0) return this._verbs[0]; }
  set verbs(verbs) { this._verbs = verbs; }

  set spec(spec) {
    this._spec = spec;
    for (var connectionName of spec.connectionMap.keys()) {
      var speccedConnection = spec.connectionMap.get(connectionName);
      var connection = this.connections[connectionName];
      if (connection == undefined) {
        connection = this.addConnectionName(connectionName);
      }
      // TODO: don't just overwrite here, check that the types
      // are compatible if one already exists.
      connection.type = speccedConnection.type;
      connection.direction = speccedConnection.direction;
    }
    spec.slots.forEach(slotSpec => {
      if (this._consumedSlotConnections[slotSpec.name] == undefined)
        var slotConn = this.addSlotConnection(slotSpec.name);
      this._consumedSlotConnections[slotSpec.name].slotSpec = slotSpec;
    });
  }

  addUnnamedConnection() {
    var connection = new ViewConnection(undefined, this);
    this._unnamedConnections.push(connection);
    return connection;
  }

  addConnectionName(name) {
    assert(this._connections[name] == undefined);
    this._connections[name] = new ViewConnection(name, this);
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
    assert(!this._connections[name].view, `Connection "${name}" already has a view`);

    var idx = this._unnamedConnections.indexOf(connection);
    assert(idx >= 0, `Cannot name '${name}' nonexistent unnamed connection.`);
    connection._name = name;

    connection.type = this._connections[name].type;
    if (connection.direction != this._connections[name].direction) {
      assert(connection.direction == "inout",
             `Unnamed connection cannot adjust direction ${connection.direction} to ${name}'s direction ${this._connections[name].direction}`);
      connection.direction = this._connections[name].direction;
    }

    this._connections[name] = connection;
    this._unnamedConnections.splice(idx, 1);
  }

  addSlotConnection(name) {
    let slotConn = new SlotConnection(name, this);
    this._consumedSlotConnections[name] = slotConn;
    return slotConn;
  }

  toString(nameMap, options) {
    let result = [];
    // TODO: we need at least name or tags
    if (this.name) {
      result.push(this.name);
      result.push(...this.tags);

      result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
      if (this.primaryVerb && this.primaryVerb != this.name) {
        result.push(`# verb=${this.primaryVerb}`);
      }
    } else {  // verb must exist, if there is no name.
      result.push(`particle can ${this.primaryVerb}`);
    }
    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`# unresolved particle: ${options.details}`);
      }
    }

    result = [result.join(' ')];

    for (let connection of this.unnamedConnections) {
      result.push(connection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (let connection of Object.values(this.connections)) {
      result.push(connection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    for (let slotConnection of Object.values(this._consumedSlotConnections)) {
      result.push(slotConnection.toString(nameMap, options).replace(/^|(\n)/g, '$1  '));
    }
    return result.join('\n')
  }
}

export default Particle;
