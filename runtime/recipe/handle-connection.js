// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import * as util from './util.js';
import {Type} from '../type.js';

export class HandleConnection {
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
    this._handle = undefined;
  }

  _clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    let handleConnection = new HandleConnection(this._name, particle);
    handleConnection._tags = [...this._tags];
    // Note that _rawType will be cloned later by the particle that references this connection.
    // Doing it there allows the particle to maintain variable associations across the particle
    // scope.    
    handleConnection._rawType = this._rawType;
    handleConnection._direction = this._direction;
    if (this._handle != undefined) {
      handleConnection._handle = cloneMap.get(this._handle);
      assert(handleConnection._handle !== undefined);
      handleConnection._handle.connections.push(handleConnection);
    }
    cloneMap.set(this, handleConnection);
    return handleConnection;
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
    if ((cmp = util.compareComparables(this._handle, other._handle)) != 0) return cmp;
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
    return this.direction == 'in' || this.direction == 'inout';
  }
  get isOutput() {
    return this.direction == 'out' || this.direction == 'inout';
  }
  get handle() { return this._handle; } // Handle?
  get particle() { return this._particle; } // never null

  set tags(tags) { this._tags = tags; }
  set type(type) {
    this._rawType = type;
    this._type = undefined;
    this._resetHandleType();
  }

  set direction(direction) {
    this._direction = direction;
    this._resetHandleType();
  }

  get spec() {
    if (this.particle.spec == null)
      return null;
    return this.particle.spec.connectionMap.get(this.name);
  }

  get isOptional() {
    if (this.spec == null)
      return false;
    return this.spec.isOptional;
  }

  _isValid(options) {
    if (this.direction && !['in', 'out', 'inout', 'host'].includes(this.direction)) {
      if (options && options.errors) {
        options.errors.set(this, `Invalid direction '${this.direction}' for handle connection '${this.particle.name}::${this.name}'`);
      }
      return false;
    }
    if (this.type && this.spec) {
      let connectionSpec = this.spec;
      if (!connectionSpec.isCompatibleType(this.rawType)) {
        if (options && options.errors) {
          options.errors.set(this, `Type '${this.rawType} for handle connection '${this.particle.name}::${this.name}' doesn't match particle spec's type '${connectionSpec.type}'`);
        }
        return false;
      }
      if (this.direction != connectionSpec.direction) {
        if (options && options.errors) {
          options.errors.set(this, `Direction '${this.direction}' for handle connection '${this.particle.name}::${this.name}' doesn't match particle spec's direction '${connectionSpec.direction}'`);
        }
        return false;
      }
    }
    return true;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));

    if (this.isOptional) {
      return true;
    }

    let parent;
    if (this.spec && this.spec.parentConnection)
      parent = this.particle.connections[this.spec.parentConnection.name];

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
    if (!this.handle) {
      if (parent && parent.isOptional && !parent.handle)
        return true;
      if (options) {
        options.details = 'missing handle';
      }
      return false;
    } else if (parent) {
      if (!parent.handle) {
        if (options) {
          options.details = 'parent connection missing handle';
        }
        return false;
      }
    }
    return true;
  }

  _resetHandleType() {
    if (this._handle)
      this._handle._type = undefined;
  }

  connectToHandle(handle) {
    assert(handle.recipe == this.recipe);
    this._handle = handle;
    this._resetHandleType();
    this._handle.connections.push(this);
  }

  disconnectHandle() {
    let idx = this._handle.connections.indexOf(this);
    assert(idx >= 0);
    this._handle.connections.splice(idx, 1);
    this._handle = undefined;
  }

  toString(nameMap, options) {
    let result = [];
    result.push(this.name || '*');
    // TODO: better deal with unspecified direction.
    result.push({'in': '<-', 'out': '->', 'inout': '=', 'host': '='}[this.direction] || this.direction || '=');
    if (this.handle) {
      result.push(`${(nameMap && nameMap.get(this.handle)) || this.handle.localName}`);
    }
    result.push(...this.tags.map(a => `#${a}`));

    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`// unresolved handle-connection: ${options.details}`);
      }
    }

    return result.join(' ');
  }
}
