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
import {CrdtCollectionModel} from './crdt-collection-model.js';

export function resetInMemoryStorageForTesting() {
  for (let key in __storageCache)
    __storageCache[key]._memoryMap = {};
}

class InMemoryKey extends KeyBase {
  constructor(key) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol == 'in-memory');
    parts = parts[1] ? parts.slice(1).join('://').split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
    assert(this.toString() == key);
  }

  childKeyForHandle(id) {
    return new InMemoryKey('in-memory://');
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

export class InMemoryStorage {
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
    let key = new InMemoryKey(keyFragment);
    if (key.arcId == undefined)
      key.arcId = this._arcId;
    if (key.location == undefined)
      key.location = 'in-memory-' + this.localIDBase++;
    // TODO(shanestephens): should pass in factory, not 'this' here.
    let provider = InMemoryStorageProvider.newProvider(type, this, undefined, id, key.toString());
    if (this._memoryMap[key.toString()] !== undefined)
      return null;
    this._memoryMap[key.toString()] = provider;
    return provider;
  }

  async connect(id, type, keyString) {
    let key = new InMemoryKey(keyString);
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
    return new InMemoryKey(string);
  }
}

class InMemoryStorageProvider extends StorageProviderBase {
  static newProvider(type, storageEngine, name, id, key) {
    if (type.isCollection)
      return new InMemoryCollection(type, storageEngine, name, id, key);
    return new InMemoryVariable(type, storageEngine, name, id, key);
  }
}

class InMemoryCollection extends InMemoryStorageProvider {
  constructor(type, storageEngine, name, id, key) {
    super(type, name, id, key);
    this._model = new CrdtCollectionModel();
    this._storageEngine = storageEngine;
    assert(this._version !== null);
  }

  clone() {
    let handle = new InMemoryCollection(this._type, this._storageEngine, this.name, this.id);
    handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle) {
    this.fromLiteral(await handle.toLiteral());
  }

  // Returns {version, model: [{id, value, keys: []}]}
  toLiteral() {
    return {
      version: this._version,
      model: this._model.toLiteral(),
    };
  }

  fromLiteral({version, model}) {
    this._version = version;
    this._model = new CrdtCollectionModel(model);
  }

  toList() {
    return this.toLiteral().model.map(item => item.value);
  }

  traceInfo() {
    return {items: this._model.size};
  }

  async store(value, keys, originatorId=null) {
    assert(keys != null && keys.length > 0, 'keys required');
    let trace = Tracing.start({cat: 'handle', name: 'InMemoryCollection::store', args: {name: this.name}});
    let effective = this._model.add(value.id, value, keys);
    this._version++;
    await trace.wait(
        this._fire('change', {add: [{value, keys, effective}], version: this._version, originatorId}));
    trace.end({args: {value}});
  }

  async remove(id, keys=[], originatorId=null) {
    let trace = Tracing.start({cat: 'handle', name: 'InMemoryCollection::remove', args: {name: this.name}});
    if (keys.length == 0) {
      keys = this._model.getKeys(id);
    }
    let value = this._model.getValue(id);
    if (value !== null) {
      let effective = this._model.remove(id, keys);
      this._version++;
      await trace.wait(
          this._fire('change', {remove: [{value, keys, effective}], version: this._version, originatorId}));
    }
    trace.end({args: {entity: value}});
  }

  clearItemsForTesting() {
    this._model = new CrdtCollectionModel();
  }
}

class InMemoryVariable extends InMemoryStorageProvider {
  constructor(type, storageEngine, name, id, key) {
    super(type, name, id, key);
    this._storageEngine = storageEngine;
    this._stored = null;
  }

  clone() {
    let variable = new InMemoryVariable(this._type, this._storageEngine, this.name, this.id);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle) {
    let literal = await handle.toLiteral();
    await this.fromLiteral(literal);
  }

  // Returns {version, model: [{id, value}]}
  async toLiteral() {
    let value = this._stored;
    let model = [];
    if (value != null) {
      model = [{
        id: value.id,
        value,
      }];
    }
    return {
      version: this._version,
      model,
    };
  }

  fromLiteral({version, model}) {
    let value = model.length == 0 ? null : model[0].value;
    assert(value !== undefined);
    this._stored = value;
    this._version = version;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  async get() {
    if (this.type.isPointer) {
      let value = this._stored;
      let pointedType = this.type.pointerDereference;
      // TODO: string version of dereferenced type as ID?
      let store = await this._storageEngine.connect(pointedType.toString(), pointedType, value.storageKey);
      let result = await store.get();
      return result;
    }
    return this._stored;
  }

  async set(value, originatorId=null, barrier=null) {
    assert(value !== undefined);
    // If there's a barrier set, then the originating storage-proxy is expecting
    // a result so we cannot suppress the event here.
    if (JSON.stringify(this._stored) == JSON.stringify(value) && barrier == null)
      return;
    this._stored = value;
    this._version++;
    await this._fire('change', {data: this._stored, version: this._version, originatorId, barrier});
  }

  async clear(originatorId=null, barrier=null) {
    this.set(null, originatorId, barrier);
  }
}
