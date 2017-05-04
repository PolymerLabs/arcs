// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const Symbols = require('./symbols.js');

class Entity {
  constructor() {
    this[Symbols.identifier] = undefined;
  }
  get data() {
    return undefined;
  }
  // TODO: clean up internal glue
  identify(view, scope) {
    assert(scope, "need a scope to identify entity");
    if (this[Symbols.identifier]) {
      // assert view correct?
      return;
    }
    this[Symbols.identifier] = scope._newIdentifier(view, scope.typeFor(this));
  }
  toLiteral() {
    return this.rawData;
  }

  get debugString() {
    return JSON.stringify(this.rawData);
  }
}

module.exports = Entity;
