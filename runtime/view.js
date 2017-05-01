// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const tracing = require("tracelib");
const scheduler = require('./scheduler.js');

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
        return entry;
      }
    }
  }
  traceInfo() {
    return {items: this._items.length};
  }
  // HACK: replace this with some kind of iterator thing?
  toList() {
    return this._items;
  }
  // thing()

  store(entity) {
    var trace = tracing.start({cat: "view", name: "View::store", args: {name: this.name}});
    this._items.push(entity);
    trace.update({ entity });
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

  get() {
    return this._stored;
  }

  set(entity) {
    this._stored = entity;
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
