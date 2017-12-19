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
import util from './recipe/util.js';
import StorageProviderBase from './storage-provider-base.js';

class InMemoryKey {
  constructor(key) {
    var parts = key.split("://");
    this.protocol = parts[0];
    assert(this.protocol == 'in-memory');
    parts = parts[1] ? parts[1].split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
  }
  toString() {
    return `${this.protocol}://${this.arcId}^^${this.location}`;
  }
}

let __storageCache = {};

export default class InMemoryStorage {
  constructor(arc) {
      assert(arc.id !== undefined, "Arcs with storage must have ids");
      this._arc = arc;
      this._memoryMap = {};
      this.localIDBase = 0;
      // TODO(shans): re-add this assert once we have a runtime object to put it on.
      // assert(__storageCache[this._arc.id] == undefined, `${this._arc.id} already exists in local storage cache`);
      __storageCache[this._arc.id] = this;
  }

  async construct(id, type, keyFragment) {
    var key = new InMemoryKey(keyFragment);
    if (key.arcId == undefined)
      key.arcId = this._arc.id;
    if (key.location == undefined)
      key.location = 'in-memory-' + this.localIDBase++;
    var provider = InMemoryStorageProvider.newProvider(type, this._arc, undefined, id, key.toString());
    if (this._memoryMap[key.toString()] !== undefined)
      return null;
    this._memoryMap[key.toString()] = provider;
    return provider;
  }

  async connect(id, type, keyString) {
    let key = new InMemoryKey(keyString);
    if (key.arcId !== this._arc.id) {
      if (__storageCache[key.arcId] == undefined)
        return null;
      return __storageCache[key.arcId].connect(id, type, keyString);
    }
    if (this._memoryMap[keyString] == undefined)
      return null;
    // TODO assert types match?
    return this._memoryMap[keyString];
  }
}

class InMemoryStorageProvider extends StorageProviderBase {
  static newProvider(type, arc, name, id, key) {
    if (type.isSetView)
      return new InMemoryCollection(type, arc, name, id, key);
    return new InMemoryVariable(type, arc, name, id, key);
  }
}

class InMemoryCollection extends InMemoryStorageProvider {
  constructor(type, arc, name, id, key) {
    super(type, arc, name, id, key);
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

  async get(id) {
    return this._items.get(id);
  }
  traceInfo() {
    return {items: this._items.size};
  }
  // HACK: replace this with some kind of iterator thing?
  async toList() {
    return [...this._items.values()];
  }

  async store(entity) {
    var trace = tracing.start({cat: "view", name: "InMemoryCollection::store", args: {name: this.name}});
    var entityWasPresent = this._items.has(entity.id);

    this._items.set(entity.id, entity);
    this._version++;
    if (!entityWasPresent)
      this._fire('change', {add: [entity], version: this._version});
    trace.end({args: {entity}});
  }

  async remove(id) {
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

class InMemoryVariable extends InMemoryStorageProvider {
  constructor(type, arc, name, id, key) {
    super(type, arc, name, id, key);
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

  async get() {
    return this._stored;
  }

  async set(entity) {
    this._stored = entity;
    this._version++;
    this._fire('change', {data: this._stored, version: this._version});
  }

  async clear() {
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
