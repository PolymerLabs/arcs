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

// TODO: This won't be needed once runtime is transferred between contexts.
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

module.exports = View;
