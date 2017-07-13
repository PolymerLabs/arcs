// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var base = require('./base.js');
var Connection = require('./base.js').Connection;

class ViewConnection extends Connection {
  constructor(name, particle) {
    assert(particle);
    super(particle._recipe);
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
    if ((cmp = base.compareComparables(this._particle, other._particle)) != 0) return cmp;
    if ((cmp = base.compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = base.compareArrays(this._tags, other._tags, base.compareStrings)) != 0) return cmp;
    if ((cmp = base.compareComparables(this._view, other._view)) != 0) return cmp;
    // TODO: add type comparison
    // if ((cmp = base.compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = base.compareStrings(this._direction, other._direction)) != 0) return cmp;
    return 0;
  }

  get name() { return this._name; } // Parameter name?
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; }
  set type(type) { this._type = type;}
  get direction() { return this._direction; } // in/out
  set direction(direction) { this._direction = direction; }
  get view() { return this._view; } // View?
  get particle() { return this._particle; } // never null

  isResolved() {
    return this.hasDefinedType() && this.view && this.view.isResolved();
  }

  hasDefinedType() {
    return this._type !== undefined && this._direction !== undefined;
  }

  connectToView(view) {
    assert(view._recipe == this._recipe);
    if (this._type !== undefined) {
      if (view._type == undefined)
        view._type = this._type;
      else
        assert(this_type == view._type);
    } else if (view._type !== undefined) {
        this._type = view._type;
    }
    this._view = view;
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
