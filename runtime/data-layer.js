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

// TODO: This won't be needed once data is transferred between contexts.
function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function restore(entry) {
  let {id, data} = entry;
  var entity = Entity.fromLiteral(id, cloneData(data));
  // TODO: Relation magic should happen elsewhere, and be better.
  if (entity.type.isRelation) {
    let ids = data.map(literal => Identifier.fromLiteral(literal));
    let entities = ids.map(id => viewFor(id.type).get(id));
    assert(!entities.includes(undefined));
    entity = new Relation(...entities);
    entity.entities = entities;
    entity[identifier] = id;
  }
  return entity;
}

class View {
  constructor(type) {
    this.type = type;
    this.data = [];
    this.observers = [];
  }

  *iterator(start, end) {
    while (start < end) {
      yield restore(this.data[start++]);
    }
  }

  get(id) {
    for (let entry of this.data) {
      if (JSON.stringify(entry.id.toLiteral()) == JSON.stringify(id.toLiteral())) {
        return restore(entry);
      }
    }
  }

  register(observer) {
    this.observers.push(observer);
    if (this.data.length > 0)
      observer(this.iterator(0, this.data.length));
  }

  store(entity) {
    console.log("storing", entity, entity[identifier]);
    let id = entity[identifier];
    let data = cloneData(entity.toLiteral());
    this.data.push({
      id,
      data: data,
    });
    for (var observer of this.observers) {
      let clone = Entity.fromLiteral(id, cloneData(data));
      observer([clone][Symbol.iterator]());
    }
  }
}

let types = new Map();
// TODO: more elaborate type keys
var nextType = 1;

class Type {
  constructor(key) {
    let normalized = JSON.stringify(key);
    let type = types.get(normalized);
    if (type) {
      return type;
    }
    this.key = key;
    types.set(normalized, this);
  }
  get isRelation() {
    return Array.isArray(this.key);
  }
  toLiteral() {
    return this.key;
  }
  static fromLiteral(literal) {
    return new Type(literal);
  }
  static generate() {
    return new Type(nextType++);
  }
}

// TODO: more elaborate identifier keys
var nextIdentifier = 1;
// TODO: relation identifier should incorporate key/value identifiers
class Identifier {
  constructor(view, type, key) {
    this.view = type;
    this.type = type;
    this.key = key;
  }
  toLiteral() {
    return [this.view, this.type.toLiteral(), this.key];
  }
  static fromLiteral(data) {
    let [view, literalType, key] = data;
    return new Identifier(view, Type.fromLiteral(literalType), key);
  }
  static generate(view, type) {
    return new Identifier(view, type, nextIdentifier++);
  }
}

let identifier = Symbol('id');
class Entity {
  constructor() {
    this[identifier] = undefined;
  }
  get data() {
    return undefined;
  }
  get type() {
    return this[identifier]
        ? this[identifier].type
        : this.constructor.type;
  }
  // TODO: clean up internal glue
  identify(view) {
    if (this[identifier]) {
      // assert view correct?
      return;
    }
    this[identifier] = Identifier.generate(view, this.type);
  }
  toLiteral() {
    return this.data;
  }
  static fromLiteral(id, literal) {
    // TODO: restore as the appropriate type from type registry?
    let entity = new BasicEntity(literal);
    entity[identifier] = id;
    return entity;
  }
}

class BasicEntity extends Entity {
  constructor(rawData) {
    super();
    this.rawData = rawData;
  }
  get data() {
    return this.rawData;
  }
}
BasicEntity.type = Type.generate();

function testEntityClass(type) {
  class TestEntity extends BasicEntity {
  }
  TestEntity.type = new Type(type);
  return TestEntity;
}

// TODO: Should relations normalized by another layer, or here?
class Relation extends Entity {
  constructor(...entities) {
    super();
    this.entities = entities;
  }
  get data() {
    return this.entities.map(entity => entity[identifier].toLiteral());
  }
  get type() {
    if (this[identifier]) {
      return this[identifier].type;
    }
    return new Type(this.entities.map(entity => entity.type));
  }
}

let views = new Map();
function viewFor(type, coordinator) {
  var result = undefined;
  if (coordinator)
    result = coordinator.views.get(type)
  if (!result)
    result = views.get(type);
  if (!result) {
    console.log("constructing new view for", type);
    result = new View(type);
    views.set(type, result);
  }
  return result;
}

function commit(entities) {
  let view = null; // TODO: pass the correct view identifiers.
  for (let entity of entities) {
    if (entity instanceof Relation) {
      entity.entities.forEach(entity => entity.identify(view));
    }
  }
  for (let entity of entities) {
    entity.identify(view);
  }
  for (let entity of entities) {
    if (entity instanceof Relation) {
      entity.entities.forEach(entity => viewFor(entity.type).store(entity));
    }
    viewFor(entity.type).store(entity);
  }
}

function trash() {
  views = new Map();
}

Object.assign(exports, {
  Entity,
  BasicEntity,
  Relation,
  testing: {
    testEntityClass,
    trash,
  },
  internals: {
    viewFor,
    identifier,
    commit,
    Type,
  }
});
