// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {ConnectionSpec} from '../particle-spec.js';
import {Type} from '../type.js';

import {Handle} from './handle.js';
import {Particle} from './particle.js';
import {Recipe} from './recipe.js';
import {compareArrays, compareComparables, compareStrings} from './util.js';

export type Direction = 'in' | 'out' | 'inout' | 'host';

export class HandleConnection {
  _recipe: Recipe;
  _name: string;
  _tags: string[] = [];
  _type: Type | undefined = undefined;
  _rawType: Type | undefined = undefined;
  _direction: Direction | undefined = undefined;
  _particle: Particle;
  _handle: Handle | undefined = undefined;

  constructor(name, particle) {
    assert(particle);
    assert(particle.recipe);
    this._recipe = particle.recipe;
    this._name = name;
    this._particle = particle;
  }

  _clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    const handleConnection = new HandleConnection(this._name, particle);
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

  _compareTo(other): number {
    let cmp;
    if ((cmp = compareComparables(this._particle, other._particle)) !== 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) !== 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) !== 0) return cmp;
    if ((cmp = compareComparables(this._handle, other._handle)) !== 0) return cmp;
    // TODO: add type comparison
    // if ((cmp = compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = compareStrings(this._direction, other._direction)) !== 0) return cmp;
    return 0;
  }

  get recipe() { return this._recipe; }
  get name() { return this._name; } // Parameter name?
  getQualifiedName() { return `${this.particle.name}::${this.name}`; }
  get tags() { return this._tags; }
  get type() {
    if (this._type) {
      return this._type;
    }
    return this._rawType;
  }
  get rawType() {
    return this._rawType;
  }
  get direction() { return this._direction; } // in/out
  get isInput() {
    return this.direction === 'in' || this.direction === 'inout';
  }
  get isOutput() {
    return this.direction === 'out' || this.direction === 'inout';
  }
  get handle() { return this._handle; } // Handle?
  get particle() { return this._particle; } // never null

  set tags(tags: string[]) { this._tags = tags; }
  set type(type: Type) {
    this._rawType = type;
    this._type = undefined;
    this._resetHandleType();
  }

  set direction(direction) {
    this._direction = direction;
    this._resetHandleType();
  }

  get spec(): ConnectionSpec {
    if (this.particle.spec == null) {
      return null;
    }
    return this.particle.spec.connectionMap.get(this.name);
  }

  get isOptional(): boolean {
    if (this.spec == null) {
      return false;
    }
    return this.spec.isOptional;
  }

  _isValid(options): boolean {
    if (this.direction && !['in', 'out', 'inout', 'host', '`consume', '`provide'].includes(this.direction)) {
      if (options && options.errors) {
        options.errors.set(this, `Invalid direction '${this.direction}' for handle connection '${this.getQualifiedName()}'`);
      }
      return false;
    }
    if (this.type && this.spec) {
      const connectionSpec = this.spec;
      if (!connectionSpec.isCompatibleType(this.rawType)) {
        if (options && options.errors) {
          options.errors.set(this, `Type '${this.rawType.toString()} for handle connection '${this.getQualifiedName()}' doesn't match particle spec's type '${connectionSpec.type.toString()}'`);
        }
        return false;
      }
      if (this.direction !== connectionSpec.direction) {
        if (options && options.errors) {
          options.errors.set(this, `Direction '${this.direction}' for handle connection '${this.getQualifiedName()}' doesn't match particle spec's direction '${connectionSpec.direction}'`);
        }
        return false;
      }
    }
    return true;
  }

  isResolved(options?): boolean {
    assert(Object.isFrozen(this));

    if (this.isOptional) {
      return true;
    }

    let parent;
    if (this.spec && this.spec.parentConnection) {
      parent = this.particle.connections[this.spec.parentConnection.name];
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
    if (!this.handle) {
      if (parent && parent.isOptional && !parent.handle) {
        return true;
      }
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
    if (this._handle) {
      this._handle._type = undefined;
    }
  }

  connectToHandle(handle) {
    assert(handle.recipe === this.recipe);
    this._handle = handle;
    this._resetHandleType();
    this._handle.connections.push(this);
  }

  disconnectHandle() {
    const idx = this._handle.connections.indexOf(this);
    assert(idx >= 0);
    this._handle.connections.splice(idx, 1);
    this._handle = undefined;
  }

  toString(nameMap, options) {
    const result = [];
    result.push(this.name || '*');
    // TODO: better deal with unspecified direction.
    result.push({'in': '<-', 'out': '->', 'inout': '=', 'host': '=', '`consume': '<-', '`provide': '->'}[this.direction] || this.direction || '=');
    if (this.handle) {
      if (this.handle.immediateValue) {
        result.push(this.handle.immediateValue.name);
      } else {
        result.push(`${(nameMap && nameMap.get(this.handle)) || this.handle.localName}`);
      }
    }
    result.push(...this.tags.map(a => `#${a}`));

    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`// unresolved handle-connection: ${options.details}`);
      }
    }

    return result.join(' ');
  }

  // TODO: the logic is wrong :)
  findSpecsForUnnamedHandles() {
    return this.particle.spec.connections.filter(specConn => {
          // filter specs with matching types that don't have handles bound to the corresponding handle connection.
          return !specConn.isOptional &&
                 this.handle.type.equals(specConn.type) &&
                 !this.particle.getConnectionByName(specConn.name).handle;
        });
  }
}
