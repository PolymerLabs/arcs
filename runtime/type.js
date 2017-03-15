// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const typeString = require('./type-string.js');

class Type {
  constructor(key, scope) {
    assert(scope);
    let normalized = JSON.stringify(key);
    let type = scope._types.get(normalized);
    if (type) {
      return type;
    }
    this.key = key;
    scope._types.set(normalized, this);
  }
  get isRelation() {
    return typeString.isRelation(this.key);
  }
  get isView() {
    return typeString.isView(this.key);
  }
  get isVariable() {
    return typeString.isVariable(this.key);
  }
  get primitiveType() {
    return typeString.primitiveType(this.key);
  }
  toLiteral() {
    return this.key;
  }
  static fromLiteral(literal, scope) {
    assert(scope);
    return new Type(literal, scope);
  }

  viewOf(scope) {
    return new Type(typeString.viewOf(this.key), scope);
  }

  static typeVariable() {
    return typeString.typeVariable();
  }
}

module.exports = Type;
