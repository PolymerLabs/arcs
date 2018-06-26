// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import {assert} from '../../platform/assert-web.js';
import {Tracing} from '../../tracelib/trace.js';
import {StorageProviderBase} from './storage-provider-base.js';
import {KeyBase} from './key-base.js';

class ScottKey extends KeyBase {
  constructor(key) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol == 'scott');
    parts = parts[1] ? parts.slice(1).join('://').split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
    assert(this.toString() == key);
  }

  childKeyForHandle(id) {
    return new ScottKey('scott://');
  }

  toString() {
    if (this.location !== undefined && this.arcId !== undefined)
      return `${this.protocol}://${this.arcId}^^${this.location}`;
    if (this.arcId !== undefined)
      return `${this.protocol}://${this.arcId}`;
    return `${this.protocol}`;
  }
}

let __storageCache = {};

export class ScottStorage {
  constructor(arcId) {
      assert(arcId !== undefined, 'Arcs with storage must have ids');
      this._arcId = arcId;
      this._memoryMap = {};
      this.localIDBase = 0;
      // TODO(shans): re-add this assert once we have a runtime object to put it on.
      // assert(__storageCache[this._arc.id] == undefined, `${this._arc.id} already exists in local storage cache`);
      __storageCache[this._arcId] = this;
  }

  async construct(id, type, keyFragment) {
    let key = new ScottKey(keyFragment);
    if (key.arcId == undefined)
      key.arcId = this._arcId;
    if (key.location == undefined)
      key.location = 'scott-' + this.localIDBase++;
    let provider = ScottStorageProvider.newProvider(type, this._arcId, undefined, id, key.toString());
    if (this._memoryMap[key.toString()] !== undefined)
      return null;
    this._memoryMap[key.toString()] = provider;
    console.log('scott-storage: created a scott-provider', provider);
    return provider;
  }

  async connect(id, type, keyString) {
    let key = new ScottKey(keyString);
    if (key.arcId !== this._arcId.toString()) {
      if (__storageCache[key.arcId] == undefined)
        return null;
      return __storageCache[key.arcId].connect(id, type, keyString);
    }
    if (this._memoryMap[keyString] == undefined)
      return null;
    // TODO assert types match?
    return this._memoryMap[keyString];
  }

  parseStringAsKey(string) {
    return new ScottKey(string);
  }
}

class ScottStorageProvider extends StorageProviderBase {
  static newProvider(type, arcId, name, id, key) {
    if (type.isCollection)
      return new ScottCollection(type, arcId, name, id, key);
    return new ScottVariable(type, arcId, name, id, key);
  }
}

class ScottCollection extends ScottStorageProvider {
  constructor(type, arcId, name, id, key) {
    super(type, arcId, name, id, key);
    assert(this._version !== null);
    this._items = new Map();
    this._entityClass = type.getEntitySchema().entityClass();
  }

  clone() {
    let handle = new ScottCollection(this._type, this._arcId, this.name, this.id);
    handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle) {
    let {list, version} = await handle.toListWithVersion();
    assert(version !== null);
    await this._fromListWithVersion(list, version);
  }

  async _fromListWithVersion(list, version) {
    this._version = version;
    list.forEach(item => this._items.set(item.id, item));
  }

  async _require() {
    if (!this._initialized) {
      this._initialized = true;
      this._items.set('key0', new this._entityClass({scottitude: 100}));
    }
    return true;
  }

  async get(id) {
    await this._require();
    return this._items.get(id);
  }
  traceInfo() {
    return {items: this._items.size};
  }
  // HACK: replace this with some kind of iterator thing?
  async toList() {
    await this._require();
    return [...this._items.values()];
  }

  async toListWithVersion() {
    return {list: [...this._items.values()], version: this._version};
  }

  async store(entity) {
    let trace = Tracing.start({cat: 'handle', name: 'ScottCollection::store', args: {name: this.name}});
    let entityWasPresent = this._items.has(entity.id);
    if (entityWasPresent && (JSON.stringify(this._items.get(entity.id)) == JSON.stringify(entity))) {
      trace.end({args: {entity}});
      return;
    }
    this._items.set(entity.id, entity);
    this._version++;
    if (!entityWasPresent)
      this._fire('change', {add: [entity], version: this._version});
    trace.end({args: {entity}});
  }

  async remove(id) {
    let trace = Tracing.start({cat: 'handle', name: 'ScottCollection::remove', args: {name: this.name}});
    if (!this._items.has(id)) {
      return;
    }
    let entity = this._items.get(id);
    assert(this._items.delete(id));
    this._version++;
    this._fire('change', {remove: [entity], version: this._version});
    trace.end({args: {entity}});
  }

  clearItemsForTesting() {
    this._items.clear();
  }

  // TODO: Something about iterators??
  // TODO: Something about changing order?

  serializedData() {
    return this.toList();
  }
}

class ScottVariable extends ScottStorageProvider {
  constructor(type, arcId, name, id, key) {
    super(type, arcId, name, id, key);
    this._stored = null;
  }

  clone() {
    let variable = new ScottVariable(this._type, this._arcId, this.name, this.id);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle) {
    let {data, version} = await handle.getWithVersion();
    await this._setWithVersion(data, version);
  }

  async _setWithVersion(data, version) {
    this._stored = data;
    this._version = version;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  async get() {
    return this._stored;
  }

  async getWithVersion() {
    return {data: this._stored, version: this._version};
  }

  async set(entity) {
    if (JSON.stringify(this._stored) == JSON.stringify(entity))
      return;
    this._stored = entity;
    this._version++;
    this._fire('change', {data: this._stored, version: this._version});
  }

  async clear() {
    this.set(null);
  }

  serializedData() {
    return [this._stored];
  }
}
