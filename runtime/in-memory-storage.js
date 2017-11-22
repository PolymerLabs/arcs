// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from '../platform/assert-web.js';
import tracing from "../tracelib/trace.js";
import scheduler from './scheduler.js';
import util from './recipe/util.js';

class InMemoryStorageProvider {
  constructor(type, arc, name, id) {
    var trace = tracing.start({cat: 'view', name: 'InMemoryStorageProvider::constructor', args: {type: type.key, name: name}});
    this._type = type;
    this._arc = arc;
    this._listeners = new Map();
    this.name = name;
    this._version = 0;
    this.id = id || this._arc.generateID();
    this.source = null;
    trace.end();
  }

  generateID() {
    return this._arc.generateID();
  }

  generateIDComponents() {
    return this._arc.generateIDComponents();
  }

  get type() {
    return this._type;
  }
  // TODO: add 'once' which returns a promise.
  on(kind,  callback, target) {
    assert(target !== undefined, "must provide a target to register a view event handler");
    let listeners = this._listeners.get(kind) || new Map();
    listeners.set(callback, {version: -Infinity, target});
    this._listeners.set(kind, listeners);
  }

  _fire(kind, details) {
    var listenerMap = this._listeners.get(kind);
    if (!listenerMap || listenerMap.size == 0)
      return;

    var callTrace = tracing.start({cat: 'view', name: 'InMemoryStorageProvider::_fire', args: {kind, type: this._type.key,
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

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.name, other.name)) != 0) return cmp;
    if ((cmp = util.compareNumbers(this._version, other._version)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.source, other.source)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.id, other.id)) != 0) return cmp;
    return 0;
  }

  toString(viewTags) {
    let results = [];
    let viewStr = [];
    viewStr.push(`view`);
    if (this.name) {
      viewStr.push(`${this.name}`);
    }
    viewStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      viewStr.push(`'${this.id}'`);
    }
    if (viewTags && viewTags.length) {
      viewStr.push(`${[...viewTags].join(' ')}`);
    }
    if (this.source) {
      viewStr.push(`in '${this.source}'`);
    }
    results.push(viewStr.join(' '));
    if (this.description)
      results.push(`  description \`${this.description}\``)
    return results.join('\n');
  }
}

export class InMemoryCollection extends ViewBase {
  constructor(type, arc, name, id) {
    super(type, arc, name, id);
    this._items = new Map();
  }

  clone() {
    var view = new InMemoryCollection(this._type, this._arc, this.name, this.id);
    view.cloneFrom(this);
    return view;
  }

  cloneFrom(view) {
    this.name = view.name;
    this.source = view.source;
    this._items = new Map(view._items);
    this._version = view._version;
    this.description = view.description;
  }

  get(id) {
    return this._items.get(id);
  }
  traceInfo() {
    return {items: this._items.size};
  }
  // HACK: replace this with some kind of iterator thing?
  toList() {
    return [...this._items.values()];
  }

  store(entity) {
    var trace = tracing.start({cat: "view", name: "InMemoryCollection::store", args: {name: this.name}});
    var entityWasPresent = this._items.has(entity.id);

    this._items.set(entity.id, entity);
    this._version++;
    if (!entityWasPresent)
      this._fire('change', {add: [entity], version: this._version});
    trace.end({args: {entity}});
  }

  remove(id) {
    var trace = tracing.start({cat: "view", name: "InMemoryCollection::remove", args: {name: this.name}});
    if (!this._items.has(id)) {
      return;
    }
    let entity = this._items.get(id);
    assert(this._items.delete(id));
    this._version++;
    this._fire('change', {remove: [entity], version: this._version});
    trace.end({args: {entity}});
  }

  // TODO: Something about iterators??
  // TODO: Something about changing order?

  extractEntities(set) {
    this._items.forEach(a => set.add(a));
  }

  serialize(list) {
    list.push({
      id: this.id,
      sort: 'view',
      type: this.type.toLiteral(),
      name: this.name,
      values: this.toList().map(a => a.id),
      version: this._version
    });
  }

  serializeMappingRecord(list) {
    list.push({
      id: this.id,
      sort: 'view',
      type: this.type.toLiteral(),
      name: this.name,
      version: this._version,
      arc: this._arc.id
    })
  }
}

export class InMemoryVariable extends InMemoryStorageProvider {
  constructor(type, arc, name, id) {
    super(type, arc, name, id);
    this._stored = null;
  }

  clone() {
    var variable = new InMemoryVariable(this._type, this._arc, this.name, this.id);
    variable.cloneFrom(this);
    return variable;
  }

  cloneFrom(variable) {
    this._stored = variable._stored;
    this._version = variable._version;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  get() {
    return this._stored;
  }

  set(entity) {
    this._stored = entity;
    this._version++;
    this._fire('change', {data: this._stored, version: this._version});
  }

  clear() {
    this.set(undefined);
  }

  extractEntities(set) {
    if (!this._stored) {
      return;
    }
    set.add(this._stored);
  }

  serialize(list) {
    if (this._stored == undefined)
      return;
    list.push({
      id: this.id,
      sort: 'variable',
      type: this.type.toLiteral(),
      name: this.name,
      value: this._stored.id,
      version: this._version
    });
  }

  serializeMappingRecord(list) {
    list.push({
      id: this.id,
      sort: 'variable',
      type: this.type.toLiteral(),
      name: this.name,
      version: this._version,
      arc: this._arc.id
    })
  }
}
