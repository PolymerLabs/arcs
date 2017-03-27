/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

const assert = require('assert');
const view = require('./view.js');
const Symbols = require('./symbols.js');
const Entity = require('./entity.js');
const Type = require('./type.js');
const Relation = require('./relation.js');
const Scope = require('./scope.js');

class BasicEntity extends Entity {
  constructor(rawData) {
    super();
    this.rawData = rawData;
  }
  get data() {
    return this.rawData;
  }
}

function testEntityClass(type) {
  return class TestEntity extends BasicEntity {
    static get key() {
      return type;
    }
  };
}

Object.assign(exports, {
  Entity,
  BasicEntity,
  Relation,
  testing: {
    testEntityClass,
  },
  Scope,
  internals: {
    identifier: Symbols.identifier,
    Type,
    View: view.View,
    ViewBase: view.ViewBase,
    SingletonView: view.SingletonView
  }
});
