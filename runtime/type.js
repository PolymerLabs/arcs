// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const typeLiteral = require('./type-literal.js');

class Type {
  constructor(key) {
    assert(!typeLiteral.isNamedVariable(key));
    this.key = key;
  }
  equals(type) {
    return typeLiteral.equal(type.toLiteral(), this.toLiteral());
  }
  get isRelation() {
    return typeLiteral.isRelation(this.key);
  }
  get isView() {
    return typeLiteral.isView(this.key);
  }
  get isVariable() {
    return typeLiteral.isVariable(this.key);
  }

  get hasVariable() {
    return typeLiteral.hasVariable(this.key);
  }

  get isValid() {
    return !typeLiteral.isNamedVariable(this.key);
  }

  primitiveType(scope) {
    assert(scope);
    return new Type(typeLiteral.primitiveType(this.key), scope);
  }
  toLiteral() {
    return this.key;
  }
  static fromLiteral(literal, scope) {
    assert(scope);

    return new Type(literal, scope);
  }

  viewOf(scope) {
    return new Type(typeLiteral.viewOf(this.key), scope);
  }

  get variableID() {
    return typeLiteral.variableID(this.key);
  }

  static typeVariable(name, scope) {
    return new Type(typeLiteral.typeVariable(name), scope);
  }

  toString() {
    return typeLiteral.stringFor(this.key);
  }
}

module.exports = Type;
