// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from 'assert';
import util from './util.js';

class ViewConnection {
  constructor(name, particle) {
    assert(particle);
    assert(particle.recipe);
    this._recipe = particle.recipe;
    this._name = name;
    this._tags = [];
    this._type = undefined;
    this._rawType = undefined;
    this._direction = undefined;
    this._particle = particle;
    this._view = undefined;
  }

  _clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    var viewConnection = new ViewConnection(this._name, particle);
    viewConnection._tags = [...this._tags];
    viewConnection._type = this._type;
    viewConnection._rawType = this._rawType;
    viewConnection._direction = this._direction;
    if (this._view != undefined) {
      viewConnection._view = cloneMap.get(this._view);
      assert(viewConnection._view !== undefined);
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
  get type() {
    if (this._type)
      return this._type;
    return this._rawType;
  }
  get rawType() {
    return this._rawType;
  }
  get direction() { return this._direction; } // in/out
  get isInput() {
    return this.direction == "in" || this.direction == "inout";
  }
  get isOutput() {
    return this.direction == "out" || this.direction == "inout";
  }
  get view() { return this._view; } // View?
  get particle() { return this._particle; } // never null

  set tags(tags) { this._tags = tags; }
  set type(type) {
    this._rawType = type;
    this._type = undefined;
    this._resetViewType();
  }

  set direction(direction) {
    this._direction = direction;
    this._resetViewType();
  }

  get spec() {
    return this.particle.spec.connectionMap.get(this.name);
  }

  get isOptional() {
    return this.spec.isOptional;
  }

  _isValid() {
    if (this.direction && !['in', 'out', 'inout', 'host'].includes(this.direction)) {
      return false;
    }
    if (this.type && this.particle && this.particle.spec) {
      let connectionSpec = this.particle.spec.connectionMap.get(this.name);
      if (connectionSpec) {
        // TODO: this shouldn't be a direct equals comparison
        if (!this.rawType.equals(connectionSpec.type)) {
          return false;
        }
        if (this.direction != connectionSpec.direction) {
          return false;
        }
      }
    }
    return true;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));

    if (this.isOptional) {
      return true;
    }

    // TODO: This should use this._type, or possibly not consider type at all.
    if (!this.type) {
      if (options) {
        options.details = 'missing type';
      }
      return false;
    }
    if (!this._direction) {
      if (options) {
        options.details = 'missing direction';
      }
      return false;
    }
    if (!this.view) {
      if (options) {
        options.details = 'missing view';
      }
      return false;
    }
    return true;
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

  toString(nameMap, options) {
    let result = [];
    result.push(this.name || '*');
    // TODO: better deal with unspecified direction.
    result.push({'in': '<-', 'out': '->', 'inout': '='}[this.direction] || this.direction || '=');
    if (this.view) {
      result.push(`${(nameMap && nameMap.get(this.view)) || this.view.localName}`);
    }
    result.push(...this.tags);

    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`# unresolved view-connection: ${options.details}`);
      }
    }

    return result.join(' ');
  }
}

export default ViewConnection;
