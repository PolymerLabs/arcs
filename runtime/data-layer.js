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

function restore(entry, scope) {
  assert(scope);
  let {id, data} = entry;
  var entity = Entity.fromLiteral(id, cloneData(data));
  // TODO: Relation magic should happen elsewhere, and be better.
  if (scope.typeFor(entity).isRelation) {
    let ids = data.map(literal => Identifier.fromLiteral(literal, scope));
    let entities = ids.map(id => scope._viewFor(id.type).get(id));
    assert(!entities.includes(undefined));
    entity = new Relation(...entities);
    entity.entities = entities;
    entity[identifier] = id;
  }
  return entity;
}

function emptyRegistrationSlot() {};

class View {
  constructor(type, scope) {
    assert(scope);
    this.type = type;
    this._scope = scope;
    this.data = [];
    this.observers = [];
  }

  *iterator(start, end) {
    while (start < end) {
      yield restore(this.data[start++], this._scope);
    }
  }

  get(id) {
    for (let entry of this.data) {
      if (JSON.stringify(entry.id.toLiteral()) == JSON.stringify(id.toLiteral())) {
        return restore(entry, this._scope);
      }
    }
  }

  checkpoint() {
    if (this._checkpoint == undefined)
      this._checkpoint = this.data.length;
  }

  revert() {
    if (this._checkpoint == undefined)
      return;
    this.data.splice(this._checkpoint);
    this._checkpoint = undefined;
  }

  register(observer) {
    var rid = this.observers.length;
    this.observers.push(observer);
    if (this.data.length > 0)
      observer(this.iterator(0, this.data.length));
    return rid;
  }

  unregister(rid) {
    for (var i = rid + 1; i < this.observers.length; i++) {
      if (this.observers[i] !== emptyRegistrationSlot) {
        this.observers[rid] = emptyRegistrationSlot;
        return;
      }
    }
    this.observers.splice(rid);
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

class Scope {
  constructor() {
    this._types = new Map();
    // TODO: more elaborate type keys
    this._nextType = 1;
    // TODO: more elaborate identifier keys
    this._nextIdentifier = 1;
    this._views = new Map();
  }

  _viewFor(type) {
    assert(type instanceof Type);
    var result = this._views.get(type);
    if (!result) {
      console.log("constructing new view for", type);
      result = new View(type, this);
      this._views.set(type, result);
    }
    return result;
  }

  typeFor(classOrInstance) {
    if (classOrInstance instanceof Entity) {
      if (classOrInstance[identifier]) {
        assert(classOrInstance[identifier].type);
        return classOrInstance[identifier].type;
      }

      if (classOrInstance instanceof Relation) {
        return Relation.typeFor(classOrInstance, this);
      }

      return this.typeFor(classOrInstance.constructor);
    }
    if (!this._types.has(classOrInstance)) {
      let key = classOrInstance.key || this.nextType++;
      this._types.set(classOrInstance, new Type(key, this));
    }
    return this._types.get(classOrInstance);
  }

  _newIdentifier(view, type) {
    return new Identifier(view, type, this._nextIdentifier++);
  }

  commit(entities) {
    let view = null; // TODO: pass the correct view identifiers.
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => entity.identify(view, this));
      }
    }
    for (let entity of entities) {
      entity.identify(view, this);
    }
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => this._viewFor(this.typeFor(entity)).store(entity));
      }
      this._viewFor(this.typeFor(entity)).store(entity);
    }
  }
}

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
    return Array.isArray(this.key);
  }
  toLiteral() {
    return this.key;
  }
  static fromLiteral(literal, scope) {
    assert(scope);
    return new Type(literal, scope);
  }
}

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
  static fromLiteral(data, scope) {
    assert(scope);
    let [view, literalType, key] = data;
    return new Identifier(view, Type.fromLiteral(literalType, scope), key);
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
  // TODO: clean up internal glue
  identify(view, scope) {
    assert(scope);
    if (this[identifier]) {
      // assert view correct?
      return;
    }
    this[identifier] = scope._newIdentifier(view, scope.typeFor(this));
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

function testEntityClass(type) {
  return class TestEntity extends BasicEntity {
    static get key() {
      return type;
    }
  };
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
  static typeFor(relation, scope) {
    assert(scope);
    return new Type(relation.entities.map(entity => scope.typeFor(entity)), scope);
  }
}

Object.assign(exports, {
  Entity,
  BasicEntity,
  Relation,
  testing: {
    testEntityClass,
    viewFor(type, scope) {
      return scope._viewFor(type);
    },
  },
  Scope,
  internals: {
    identifier,
    Type,
    View
  }
});
