// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import * as util from './util.js';
import {TypeChecker} from './type-checker.js';
import {Type} from '../type.js';

export class Handle {
  constructor(recipe) {
    assert(recipe);
    this._recipe = recipe;
    this._id = null;
    this._localName = undefined;
    this._tags = [];
    this._type = undefined;
    this._fate = null;
    // TODO: replace originalFate and originalId with more generic mechanism for tracking
    // how and from what the recipe was generated.
    this._originalFate = null;
    this._originalId = null;
    this._connections = [];
    this._mappedType = undefined;
    this._storageKey = undefined;
    this._pattern = undefined;
  }

  _copyInto(recipe) {
    let handle = undefined;
    if (this._id !== null && ['map', 'use', 'copy'].includes(this.fate))
      handle = recipe.findHandle(this._id);

    if (handle == undefined) {
      handle = recipe.newHandle();
      handle._id = this._id;
      handle._tags = [...this._tags];
      handle._type = this._type ? Type.fromLiteral(this._type.toLiteral()) : undefined;
      handle._fate = this._fate;
      handle._originalFate = this._originalFate;
      handle._originalId = this._originalId;
      handle._mappedType = this._mappedType;
      handle._storageKey = this._storageKey;

      // the connections are re-established when Particles clone their
      // attached HandleConnection objects.
      handle._connections = [];
      handle._pattern = this._pattern;
    }
    return handle;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    // TODO: type?
  }

  _finishNormalize() {
    for (let connection of this._connections) {
      assert(Object.isFrozen(connection), `Handle connection '${connection.name}' is not frozen.`);
    }
    this._connections.sort(util.compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._localName, other._localName)) != 0) return cmp;
    if ((cmp = util.compareArrays(this._tags, other._tags, util.compareStrings)) != 0) return cmp;
    // TODO: type?
    if ((cmp = util.compareStrings(this.fate, other.fate)) != 0) return cmp;
    return 0;
  }

  // a resolved Handle has either an id or create=true
  get fate() { return this._fate || '?'; }
  set fate(fate) {
    if (this._originalFate == null) {
      this._originalFate = this._fate;
    }
    this._fate = fate;
  }
  get originalFate() { return this._originalFate || '?'; }
  get originalId() { return this._originalId; }
  get recipe() { return this._recipe; }
  get tags() { return this._tags; } // only tags owned by the handle
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; } // nullable
  get id() { return this._id; }
  set id(id) {
    if (!this._originalId) {
      this._originalId = this._id;
    }
    this._id = id;
  }
  mapToStorage(storage) {
    this._id = storage.id;
    this._type = undefined;
    assert(storage.type == undefined || !(storage.type.hasVariableReference), `variable references shouldn't be part of handle types`);
    this._mappedType = storage.type;
    this._storageKey = storage.storageKey;
  }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get connections() { return this._connections; } // HandleConnection*
  get storageKey() { return this._storageKey; }
  set storageKey(key) { this._storageKey = key; }
  get pattern() { return this._pattern; }
  set pattern(pattern) { this._pattern = pattern; }

  static effectiveType(handleType, connections) {
    let typeSet = connections.filter(connection => connection.type != null).map(connection => ({type: connection.type, direction: connection.direction}));
    return TypeChecker.processTypeList(handleType, typeSet);
  }

  _isValid(options) {
    let tags = new Set();
    for (let connection of this._connections) {
      // A remote handle cannot be connected to an output param.
      if (this.fate == 'map' && ['out', 'inout'].includes(connection.direction)) {
        if (options && options.errors) {
          options.errors.set(this, `Invalid fate '${this.fate}' for handle '${this}'; it is used for '${connection.direction}' ${connection.particle.name}::${connection.name} connection`);
        }
        return false;
      }
      connection.tags.forEach(tag => tags.add(tag));
    }
    let type = Handle.effectiveType(this._mappedType, this._connections);
    if (type) {
      this._type = type;
      this._tags.forEach(tag => tags.add(tag));
      this._tags = [...tags];
      return true;
    }
    if (options && options.errors) {
      // TODO: pass options to TypeChecker.processTypeList for better error.
      options.errors.set(this, `Type validations failed for handle '${this}'`);
    }
    return false;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));
    if (!this._type) {
      if (options) {
        options.details = 'missing type';
      }
      return false;
    }
    if ((!this.type.isResolved() && this.fate !== 'create') || (!this.type.canEnsureResolved() && this.fate == 'create')) {
      if (options) {
        options.details = 'unresolved type';
      }
      return false;
    }
    switch (this.fate) {
      case '?': {
        if (options) {
          options.details = 'missing fate';
        }
        return false;
      }
      case 'copy':
      case 'map':
      case 'use': {
        if (options && this.id === null) {
          options.details = 'missing id';
        }
        return this.id !== null;
      }
      case 'create':
        return true;
      default: {
        if (options) {
          options.details = `invalid fate ${this.fate}`;
        }
        assert(false, `Unexpected fate: ${this.fate}`);
      }
    }
  }

  toString(nameMap, options) {
    // TODO: type? maybe output in a comment
    let result = [];
    result.push(this.fate);
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    result.push(...this.tags.map(a => `#${a}`));
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    if (this.type) {
      result.push('//');
      if (this.type.isResolved()) {
        result.push(this.type.resolvedType().toString());
      } else if (this.type.canEnsureResolved()) {
        let type = Type.fromLiteral(this.type.toLiteral());
        type.maybeEnsureResolved();
        result.push(type.resolvedType().toString());
      } else {
        result.push(this.type.toString());
      }
    }
    if (options && options.showUnresolved) {
      let options = {};
      if (!this.isResolved(options)) {
        result.push(` // unresolved handle: ${options.details}`);
      }
    }

    return result.join(' ');
  }
}
