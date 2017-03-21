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
  assert(scope);
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

function emptyRegistrationSlot() {};

class ViewBase {
  constructor(type, scope) {
    assert(scope);
    this.type = type;
    this._scope = scope;
    this.observers = [];
  }

  register(observer) {
    var rid = this.observers.length;
    this.observers.push(observer);
    this.update();
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
}

class SingletonView extends ViewBase {
  constructor(type, scope) {
    super(type, scope);
    this.data = undefined;
    this._pendingData = [];
  }

  checkpoint() {
    this._checkpoint = {data: this.data};
  }

  revert() {
    if (this._checkpoint == undefined)
      return;
    this.data = this._checkpoint.data;
    this._checkpoint = undefined;
  }

  store(entity) {
    var trace = tracing.start({cat: "view", name: "SingletonView::store", args: {type: this.type.key}});
    let id = entity[identifier];
    let data = cloneData(entity.toLiteral());
    this.data = { id, data };
    this.update();
    trace.end();
  }

  update() {
    if (this.data == undefined || this.observers.length == 0)
      return;
    var trace = tracing.start({cat: "view", name: "SingletonView::update", args: {type: this.type.key}});
    for (var observer of this.observers)
      observer(restore(this.data, this._scope));
    trace.end({args:{observers: this.observers.length}});
  }
}

class View extends ViewBase {
  constructor(type, scope) {
    super(type, scope);
    this.data = [];
    this.deliveredTo = 0;
  }

  get(id) {
    for (let entry of this.data) {
      if (JSON.stringify(entry.id.toLiteral()) == JSON.stringify(id.toLiteral())) {
        return restore(entry, this._scope);
      }
    }
  }

  asList() {
    return this.data.map(entry => restore(entry, this._scope));
  }

  slice(start, end) {
    return this.data.slice(start, end).map(entry => restore(entry, this._scope));
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

  store(entity) {
    var trace = tracing.start({cat: "view", name: "View::store", args: {type: this.type.key}}); 
    let id = entity[identifier];
    let data = cloneData(entity.toLiteral());
    this.data.push({
      id,
      data: data,
    });
    this.update();
    trace.end();
  }

  update() {
    if (this.deliveredTo == this.data.length || this.observers.length == 0)
      return;
    var trace = tracing.start({cat: "view", name: "View::update", args: {type: this.type.key}});
    for (var observer of this.observers) {
      observer(this.slice(this.deliveredTo));
    }
    this.deliveredTo = this.data.length;
    trace.end({args: {observers: this.observers.length}});
  }
}

Object.assign(module.exports, { ViewBase, View, SingletonView });
