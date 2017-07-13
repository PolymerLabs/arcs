// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');

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
  }

  clone(recipe) {
    var view = new View(recipe);
    view._id = this._id;
    view._tags = [...this._tags];
    view._type = this._type;
    view._create = this._create;

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
  set id(id) { this._id = id; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get create() { return this._create; }
  set create(create) { this._create = create; }
  get connections() { return this._connections } // ViewConnection*

  isResolved() {
    return (this._id !== undefined || this._create == true) && this._type !== undefined;
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
    return result.join(' ');
  }
}

module.exports = View;
