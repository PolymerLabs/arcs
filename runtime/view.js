// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const Identifier = require('./identifier.js');
const Symbols = require('./symbols.js');
const Entity = require('./entity.js');
const Relation = require('./relation.js');
let identifier = Symbols.identifier;
const tracing = require("../tracelib/trace.js");

// TODO: This won't be needed once runtime is transferred between contexts.
function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function restore(entry, scope) {
  let {id, data} = entry;
  var entity = Entity.fromLiteral(id, cloneData(data));
  var type = scope.typeFor(entity);
  entity.constructor = type.entityClass;
  // TODO: Relation magic should happen elsewhere, and be better.
  if (scope.typeFor(entity).isRelation) {
    let ids = data.map(literal => Identifier.fromLiteral(literal, scope));
    let entities = ids.map(id => scope._viewFor(id.type.viewOf(scope)).get(id));
    assert(!entities.includes(undefined));
    entity = new Relation(...entities);
    entity.entities = entities;
    entity[identifier] = id;
  }
  return entity;
}

class ViewBase {
  constructor(type, scope) {
    this._type = type;
    this._scope = scope;
    this._listeners = new Map();
  }
  get type() {
    return this._type;
  }
  on(kind, callback) {
    let listeners = this._listeners.get(kind) || [];
    this._listeners.set(kind, listeners);
    listeners.push(callback);
  }
  _fire(kind, details) {
    Promise.resolve().then(() => {
      let listeners = Array.from(this._listeners.get(kind) || []);
      for (let listener of listeners) {
        listener(this, details);
      }
    });
  }
  _serialize(entity) {
    let id = entity[identifier];
    let data = cloneData(entity.toLiteral());
    return {
      id,
      data: data,
    };
  }
  _restore(entry) {
    return restore(entry, this._scope);
  }
}

class View extends ViewBase {
  constructor(type, scope) {
    super(type, scope);
    this._items = [];
  }
  get(id) {
    for (let entry of this._items) {
      if (JSON.stringify(entry.id) == JSON.stringify(id)) {
        return this._restore(entry);
      }
    }
  }
  query() {
    // TODO
  }
  // HACK: replace this with some kind of iterator thing?
  toList() {
    return this._items.map(entry => this._restore(entry));
  }
  // thing()

  store(entity) {
    this._items.push(this._serialize(entity));
    this._fire('change');
  }
  remove(id) {
    // TODO
  }
  // TODO: Something about iterators??
  // TODO: Something about changing order?
}

class Variable extends ViewBase {
  constructor(type, scope) {
    super(type, scope);
    this._stored = null;
  }
  // HACK: this should be async
  get() {
    return this._restore(this._value);
  }
  set(entity) {
    this._stored = this._serialize(entity);
    this._fire('change');
  }
}

Object.assign(module.exports, {
  View,
  Variable,
});
