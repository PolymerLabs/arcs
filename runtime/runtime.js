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
const storage = require('./in-memory-storage.js');
const Symbols = require('./symbols.js');
const Entity = require('./entity.js');
const Schema = require('./schema.js');
const Type = require('./type.js');
const Relation = require('./relation.js');

function testEntityClass(type) {
  return new Schema({
    name: type,
    sections: [],
    parents: [],
  }).entityClass();
}

let BasicEntity = testEntityClass('BasicEntity');

Object.assign(exports, {
  Entity,
  BasicEntity,
  Relation,
  testing: {
    testEntityClass,
  },
  internals: {
    identifier: Symbols.identifier,
    Type,
    // TODO: are these used?
    Collection: storage.InMemoryCollection,
    StorageProvider: storage.InMemoryStorageProvider,
    Variable: storage.InMemoryVariable
  }
});
