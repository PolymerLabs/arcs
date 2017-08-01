// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');
var TypeChecker = require('./type-checker.js');

class View {
  constructor(recipe) {
    assert(recipe);
    this._recipe = recipe;
    this._id = undefined;
    this._localName = undefined;
    this._tags = [];
    this._type = undefined;
    this._create = false;
    this._connections = [];
    this._mappedType = undefined;
  }

  clone(recipe) {
    var view = new View(recipe);
    view._id = this._id;
    view._tags = [...this._tags];
    view._type = this._type;
    view._create = this._create;
    view._mappedType = this._mappedType;

    // the connections are re-established when Particles clone their
    // attached ViewConnection objects.
    view._connections = [];
    return view;
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    // TODO: type?
  }

  _finishNormalize() {
    for (let connection of this._connections) {
      assert(Object.isFrozen(connection));
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
    if ((cmp = util.compareNumbers(this._create, other._create)) != 0) return cmp;
    return 0;
  }

  // a resolved View has either an id or create=true
  get recipe() { return this._recipe; }
  get tags() { return this._tags; } // only tags owned by the view
  set tags(tags) { this._tags = tags; }
  get type() { return this._type; } // nullable
  get id() { return this._id; }
  mapToView(view) { this._id = view.id; this._type = undefined; this._mappedType = view.type;}
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get create() { return this._create; }
  set create(create) { this._create = create; }
  get connections() { return this._connections } // ViewConnection*

  _isValid() {
    var typeSet = [];
    if (this._mappedType)
      typeSet.push({type: this._mappedType});
    var tags = new Set();
    for (var connection of this._connections) {
      if (connection.type)
        typeSet.push({type: connection.type, direction: connection.direction, connection});
      connection.tags.forEach(tag => tags.add(tag));
    }
    var {type, valid} = TypeChecker.processTypeList(typeSet);
    if (valid) {
      this._type = type.type;
      this._tags.forEach(tag => tags.add(tag));
      this._tags = [...tags];
    }
    return valid;
  }

  isResolved() {
    assert(Object.isFrozen(this));
    return (this._id || this._create) && this._type;
  }

  toString(nameMap) {
    // TODO: type? maybe output in a comment
    let result = [];
    result.push(this.create ? 'create' : 'map');
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    result.push(...this.tags);
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    if (this.type) {
      result.push('#');
      result.push(this.type.toString());
    }
    return result.join(' ');
  }
}

module.exports = View;
