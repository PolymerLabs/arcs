/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from '../platform/assert-web.js';
import * as storage from './in-memory-storage.js';
import Symbols from './symbols.js';
import Entity from './entity.js';
import Schema from './schema.js';
import Type from './type.js';
import Relation from './relation.js';

function testEntityClass(type) {
  return new Schema({
    name: type,
    sections: [],
    parents: [],
  }).entityClass();
}

let BasicEntity = testEntityClass('BasicEntity');

export default {
  Entity,
  BasicEntity,
  Relation,
  testing: {
    testEntityClass,
  },
  internals: {
    identifier: Symbols.identifier,
    Type,
  }
};
