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
const scheduler = require('./scheduler.js');

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
  constructor(type, scope, name) {
    var trace = tracing.start({cat: 'view', name: 'ViewBase::constructor', args: {type: type.key, name: name}});
    this._type = type;
    this._scope = scope;
    this._listeners = new Map();
    this.name = name;
    trace.end();
  }

  get type() {
    return this._type;
  }
  // TODO: add 'once' which returns a promise.
  on(kind,  callback, target, trigger) {
    assert(target !== undefined, "must provide a target to register a view event handler");
    let listeners = this._listeners.get(kind) || new Map();
    listeners.set(callback, {version: -Infinity, target});
    this._listeners.set(kind, listeners);
    if (trigger) {
      scheduler.enqueue(this, [{target, callback, kind}])
    }
  }

  _fire(kind, details) {
    var listenerMap = this._listeners.get(kind);
    if (!listenerMap || listenerMap.size == 0)
      return;

    var callTrace = tracing.start({cat: 'view', name: 'ViewBase::_fire', args: {kind, type: this._type.key,
        name: this.name, listeners: listenerMap.size}});

    // TODO: wire up a target (particle)
    let eventRecords = [];

    for (let [callback, registration] of listenerMap.entries()) {
      let target = registration.target;
      eventRecords.push({target, callback, kind, details});
    }

    scheduler.enqueue(this, eventRecords);
 
    callTrace.end();
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
  constructor(type, scope, name) {
    super(type, scope, name);
    this._items = [];
  }

  clone() {
    var view = new View(this._type, this._scope, this.name);
    view._items = this._items;
    return view;
  }

  get(id) {
    for (let entry of this._items) {
      if (JSON.stringify(entry.id) == JSON.stringify(id)) {
        return this._restore(entry);
      }
    }
  }
  traceInfo() {
    return {items: this._items.length};
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
    var trace = tracing.start({cat: "view", name: "View::store", args: {name: this.name}});
    var serialization = this._serialize(entity);
    this._items.push(serialization);
    trace.update({entity: serialization});
    this._fire('change');
    trace.end();
  }

  on(kind, callback, target) {
    let trigger = kind == 'change';
    super.on(kind, callback, target, trigger);
  }

  remove(id) {
    // TODO
  }
  // TODO: Something about iterators??
  // TODO: Something about changing order?
}

class Variable extends ViewBase {
  constructor(type, scope, name) {
    super(type, scope, name);
    this._stored = null;
  }

  clone() {
    var variable = new Variable(this._type, this._scope, this.name);
    variable._stored = this._stored;
    return variable;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }
  // HACK: this should be async
  get() {
    if (this._stored == null)
      return undefined;
    return this._restore(this._stored);
  }
  set(entity) {
    if (entity[identifier] == undefined)
      entity[identifier] = this._scope._newIdentifier(this, this._scope.typeFor(entity));
    this._stored = this._serialize(entity);
    this._fire('change');
  }
  on(kind, callback, target) {
    let trigger = kind == 'change';
    super.on(kind, callback, target, trigger);
  }
}

Object.assign(module.exports, {
  View,
  Variable,
});
