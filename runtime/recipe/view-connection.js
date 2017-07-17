// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');

class ViewConnection {
  constructor(name, particle) {
    assert(particle);
    assert(particle.recipe);
    this._recipe = particle.recipe;
    this._name = name;
    this._tags = [];
    this._type = undefined;
    this._direction = undefined;
    this._particle = particle;
    this._view = undefined;
  }

  clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    var viewConnection = new ViewConnection(this._name, particle);  // Note: This is the original, not the cloned particle, is it a right?
    viewConnection._tags = [...this._tags];
    viewConnection._type = this._type;
    viewConnection._direction = this._direction;
    if (this._view != undefined) {
      viewConnection._view = cloneMap.get(this._view);
      viewConnection._view.connections.push(viewConnection);
    }
    cloneMap.set(this, viewConnection);
    return viewConnection;
  }

  _normalize() {
    this._tags.sort();
    // TODO: type?
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareComparables(this._particle, other._particle)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = util.compareArrays(this._tags, other._tags, util.compareStrings)) != 0) return cmp;
    if ((cmp = util.compareComparables(this._view, other._view)) != 0) return cmp;
    // TODO: add type comparison
    // if ((cmp = util.compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._direction, other._direction)) != 0) return cmp;
    return 0;
  }

  get recipe() { return this._recipe; }
  get name() { return this._name; } // Parameter name?
  get tags() { return this._tags; }
  get type() { return this._type; }
  get direction() { return this._direction; } // in/out
  get view() { return this._view; } // View?
  get particle() { return this._particle; } // never null

  set tags(tags) { this._tags = tags; }
  set type(type) {
    this._type = type;
    this._resetViewType();
  }

  set direction(direction) {
    this._direction = direction;
    this._resetViewType();
  }

  _isValid() {
    // TODO: 'create' is not a valid direction
    if (this.direction && !['in', 'out', 'inout', 'create'].includes(this.direction)) {
      return false;
    }
    if (this.type && this.particle && this.particle.spec) {
      let connectionSpec = this.particle.spec.connectionMap.get(this.name);
      if (connectionSpec) {
        // TODO: this shouldn't be a direct comparison
        if (this.type != connectionSpec.type) {
          return false;
        }
        if (this.direction != connectionSpec.direction) {
          return false;
        }
      }
    }
    return true;
  }

  isResolved() {
    assert(Object.isFrozen(this));
    return this._type
        && this._direction
        && this.view;
  }

  _resetViewType() {
    if (this._view)
      this._view._type = undefined;
  }

  connectToView(view) {
    assert(view.recipe == this.recipe);
    this._view = view;
    this._resetViewType();
    this._view.connections.push(this);
  }

  toString(nameMap) {
    let result = [];
    result.push(this.name || '*');
    // TODO: better deal with unspecified direction.
    result.push({'in': '<-', 'out': '->', 'inout': '='}[this.direction] || this.direction || '=');
    if (this.view) {
      result.push(`${(nameMap && nameMap.get(this.view)) || this.view.localName}`);
    }
    result.push(...this.tags);
    return result.join(' ');
  }
}

module.exports = ViewConnection;
