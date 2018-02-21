// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from '../../platform/assert-web.js';
import util from './util.js';
import TypeChecker from './type-checker.js';

class Handle {
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
  }

  _copyInto(recipe) {
    let view = undefined;
    if (this._id !== null && ['map', 'use', 'copy'].includes(this.fate))
      view = recipe.findView(this._id);

    if (view == undefined) {
      view = recipe.newHandle();
      view._id = this._id;
      view._tags = [...this._tags];
      view._type = this._type;
      view._fate = this._fate;
      view._originalFate = this._originalFate;
      view._originalId = this._originalId;
      view._mappedType = this._mappedType;
      view._storageKey = this._storageKey;

      // the connections are re-established when Particles clone their
      // attached HandleConnection objects.
      view._connections = [];
    }
    return view;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    // TODO: type?
  }

  _finishNormalize() {
    for (let connection of this._connections) {
      assert(Object.isFrozen(connection), `View connection '${connection.name}' is not frozen.`);
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

  // a resolved View has either an id or create=true
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
  get tags() { return this._tags; } // only tags owned by the view
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; } // nullable
  get id() { return this._id; }
  set id(id) {
    if (!this._originalId) {
      this._originalId = this._id;
    }
    this._id = id;
  }
  mapToView(view) {
    this._id = view.id;
    this._type = undefined;
    assert(view.type == undefined || !(view.type.hasVariableReference), `variable references shouldn't be part of handle types`);
    this._mappedType = view.type;
    this._storageKey = view.storageKey;
  }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get connections() { return this._connections; } // HandleConnection*
  get storageKey() { return this._storageKey; }
  set storageKey(key) { this._storageKey = key; }

  _isValid() {
    let typeSet = [];
    if (this._mappedType)
      typeSet.push({type: this._mappedType});
    let tags = new Set();
    for (let connection of this._connections) {
      // A remote view cannot be connected to an output param.
      if (this.fate == 'map' && ['out', 'inout'].includes(connection.direction)) {
        return false;
      }
      if (connection.type)
        typeSet.push({type: connection.type, direction: connection.direction, connection});
      connection.tags.forEach(tag => tags.add(tag));
    }
    let {type, valid} = TypeChecker.processTypeList(typeSet);
    if (valid) {
      this._type = type.type;
      this._tags.forEach(tag => tags.add(tag));
      this._tags = [...tags];
    }
    return valid;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));
    if (!this._type) {
      if (options) {
        options.details = 'missing type';
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
    result.push(...this.tags);
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    if (this.type) {
      result.push('//');
      result.push(this.type.toPrettyString());
    }
    if (options && options.showUnresolved) {
      let options = {};
      if (!this.isResolved(options)) {
        result.push(` // unresolved view: ${options.details}`);
      }
    }

    return result.join(' ');
  }
}

export default Handle;
