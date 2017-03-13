// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const Entity = require('./entity.js');
const Type = require('./type.js');
const Symbols = require('./symbols.js');

// TODO: Should relations normalized by another layer, or here?
class Relation extends Entity {
  constructor(...entities) {
    super();
    this.entities = entities;
  }
  get data() {
    return this.entities.map(entity => entity[Symbols.identifier].toLiteral());
  }
  static typeFor(relation, scope) {
    assert(scope);
    var result = new Type(relation.entities.map(entity => scope.typeFor(entity)), scope);
    return result;
  }
}

module.exports = Relation;
