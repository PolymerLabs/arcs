// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert')
var SlotConnection = require('./slot-connection.js');
var ViewConnection = require('./view-connection.js');
var util = require('./util.js');

class Particle {
  constructor(recipe, name) {
    assert(recipe);
    this._recipe = recipe;
    this._id = undefined;
    this._name = name;
    this._localName = undefined;
    this._spec = undefined;
    this._tags = [];
    this._providedSlots = [];
    this._consumedSlots = [];
    this._connections = {};
    // TODO: replace with constraint connections on the recipe
    this._unnamedConnections = [];
  }

  clone(recipe, cloneMap) {
    var particle = new Particle(recipe, this._name);
    particle._id  = this._id;
    particle._tags = [...this._tags];
    particle._providedSlots = this._providedSlots.map(slotConn => slotConn.clone(particle, cloneMap));
    particle._consumedSlots = this._consumedSlots.map(slotConn => slotConn.clone(particle, cloneMap));
    Object.keys(this._connections).forEach(key => {
      particle._connections[key] = this._connections[key].clone(particle, cloneMap);
    });
    particle._unnamedConnections = this._unnamedConnections.map(connection => connection.clone(particle, cloneMap));

    particle._spec = this._spec;

    return particle;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    let normalizedConnections = {};
    for (let key of (Object.keys(this._connections).sort())) {
      normalizedConnections[key] = this._connections[key];
    }
    this._connections = normalizedConnections;
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
    // TODO: slots
    return 0;
  }

  _isValid() {
    // TODO: implement
    if (!this.spec) {
      return true;
    }
    // TODO: this shouldn't be possible.
    return Object.entries(this.connections).every(([name, connection]) => {
      return connection.name == name;
    });
  }

  isResolved() {
    assert(Object.isFrozen(this));
    // TODO: slots
    return this.spec
        && this.spec.connectionMap.size == Object.keys(this._connections).length
        && this.unnamedConnections.length == 0;
  }

  get recipe() { return this._recipe; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get id() { return this._id; } // Not resolved until we have an ID.
  get name() { return this._name; }
  get spec() { return this._spec; }
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get providedSlots() { return this._providedSlots; } // SlotConnection*
  get consumedSlots() { return this._consumedSlots; } // SlotConnection*
  get connections() { return this._connections; } // {parameter -> ViewConnection}
  get unnamedConnections() { return this._unnamedConnections; } // ViewConnection*

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
    spec.renders.forEach(slot => {
      let slotConn = this.addSlotConnection(slot.name.name, "consume");
      if (slot.name.view)
      slotConn.connectToView(slot.name.view);
    });
    spec.exposes.forEach(slot => {
      let slotConn = this.addSlotConnection(slot.name, "provide");
      slotConn.connectToSlot(this.recipe.newSlot());
      if (slot.view)
      slotConn.connectToView(slot.view);
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

  ensureConnectionName(name) {
    return this._connections[name] || this.addConnectionName(name);
  }

  nameConnection(connection, name) {
    var idx = this._unnamedConnections.indexOf(connection);
    assert(idx >= 0);
    connection._name = name;
    this._connections[name] = connection;
    this._unnamedConnections.splice(idx, 1);
  }

  addSlotConnection(name, direction) {
    let slots = direction == "consume" ? this.consumedSlots : this.providedSlots;
    slots.push(new SlotConnection(name, direction, this));
    return slots[slots.length - 1];
  }

  isResolved() {
    if (this.id == undefined)
      return false;
    if (this._unnamedConnections.length > 0)
      return false;
    if (Object.entries(this.connections).filter(a => !a.isResolved()).length > 0)
      return false;
    if (Object.entries(this.consumedSlots).filter(c => !c.isResolved()).length > 0)
      return false;
    return true;
  }

  toString(nameMap) {
    let result = [];
    // TODO: we need at least name or tags
    result.push(this.name);
    result.push(...this.tags);
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    result = [result.join(' ')];
    for (let connection of this.unnamedConnections) {
      result.push(connection.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    for (let connection of Object.values(this.connections)) {
      result.push(connection.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    for (let slotConnection of this.consumedSlots) {
      result.push(slotConnection.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    for (let slotConnection of this.providedSlots) {
      result.push(slotConnection.toString(nameMap).replace(/^|(\n)/g, '$1  '));
    }
    return result.join('\n')
  }
}

module.exports = Particle;
