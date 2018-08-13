// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';


import {assert} from '../../../platform/assert-web.js';
import {Tracing} from '../../../tracelib/trace.js';
import {StorageProviderBase} from './storage-provider-base';
import {KeyBase} from './key-base';
import {CrdtCollectionModel} from './crdt-collection-model';
import {Type} from '../type';

export function resetInMemoryStorageForTesting() {
  for (const key in storageCache) {
    storageCache[key]._memoryMap = {};
  }
}

class InMemoryKey extends KeyBase {
  protocol: string;
  arcId: string;
  location: string;

  constructor(key: string) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol === 'in-memory');
    parts = parts[1] ? parts.slice(1).join('://').split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
    assert(this.toString() === key);
  }

  childKeyForHandle(id) {
    return new InMemoryKey('in-memory://');
  }

  toString() {
    if (this.location !== undefined && this.arcId !== undefined) {
      return `${this.protocol}://${this.arcId}^^${this.location}`;
    }
    if (this.arcId !== undefined) {
      return `${this.protocol}://${this.arcId}`;
    }
    return `${this.protocol}`;
  }
}

const storageCache = {};

export class InMemoryStorage {
  private _memoryMap: { [index: string]: InMemoryStorageProvider};
  private _typeMap: Map<Type, InMemoryCollection>;
  private localIDBase: number;

  constructor(private arcId: string) {
    assert(arcId !== undefined, 'Arcs with storage must have ids');
    this._memoryMap = {};
    this._typeMap = new Map();
    this.localIDBase = 0;
    // TODO(shans): re-add this assert once we have a runtime object to put it on.
    // assert(storageCache[this._arc.id] == undefined, `${this._arc.id} already exists in local storage cache`);
    storageCache[this.arcId] = this;
  }

  async construct(id: string,
                  type: Type,
                  keyFragment: string) {
    const key = new InMemoryKey(keyFragment);
    if (key.arcId === undefined) {
      key.arcId = this.arcId;
    }
    if (key.location === undefined) {
      key.location = 'in-memory-' + this.localIDBase++;
    }
    // TODO(shanestephens): should pass in factory, not 'this' here.
    const provider = InMemoryStorageProvider.newProvider(type, this, undefined, id, key.toString());
    if (this._memoryMap[key.toString()] !== undefined) {
      return null;
    }
    this._memoryMap[key.toString()] = provider;
    return provider;
  }

  async connect(id: string, type: Type, keyString: string) {
    const key = new InMemoryKey(keyString);
    if (key.arcId !== this.arcId.toString()) {
      if (storageCache[key.arcId] === undefined) {
        return null;
      }
      return storageCache[key.arcId].connect(id, type, keyString);
    }
    if (this._memoryMap[keyString] === undefined) {
      return null;
    }
    // TODO assert types match?
    return this._memoryMap[keyString];
  }

  async share(id: string,
              type: Type,
              keyString: string) : Promise<StorageProviderBase> {
    const key = new InMemoryKey(keyString);
    assert(key.arcId === this.arcId.toString());
    if (this._memoryMap[keyString] === undefined) {
      return this.construct(id, type, keyString);
    }
    return this._memoryMap[keyString];
  }

  async baseStorageFor(type) {
    if (this._typeMap.has(type)) {
      return this._typeMap.get(type);
    }
    const storage = await this.construct(type.toString(), type.collectionOf(), 'in-memory') as InMemoryCollection;
    this._typeMap.set(type, storage);
    return storage;
  }

  parseStringAsKey(s: string) {
    return new InMemoryKey(s);
  }

  shutdown() {
    return Promise.resolve();
  }
}

class InMemoryStorageProvider extends StorageProviderBase {
  static newProvider(type: Type,
                     storageEngine: InMemoryStorage,
                     name: string,
                     id: string,
                     key: string) {
    if (type.isCollection) {
      return new InMemoryCollection(type, storageEngine, name, id, key);
    }
    return new InMemoryVariable(type, storageEngine, name, id, key);
  }
}

class InMemoryCollection extends InMemoryStorageProvider {
  _model: CrdtCollectionModel;
  _storageEngine: InMemoryStorage;
  _backingStore: InMemoryCollection;

  constructor(type: Type,
              storageEngine: InMemoryStorage,
              name: string,
              id: string,
              key: string) {
    super(type, name, id, key);
    this._model = new CrdtCollectionModel();
    this._storageEngine = storageEngine;
    this._backingStore = null;
    assert(this.version !== null);
  }

  clone() {
    const handle = new InMemoryCollection(this.type, this._storageEngine, this.name, this.id, null);
    handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle) {
    this.fromLiteral(await handle.toLiteral());
  }

  // Returns {version, model: [{id, value, keys: []}]}
  toLiteral() {
    return {
      version: this.version,
      model: this._model.toLiteral(),
    };
  }

  fromLiteral({version, model}) {
    this.version = version;
    this._model = new CrdtCollectionModel(model);
  }

  async toList() {
    if (this.type.primitiveType().isReference) {
      const items = this.toLiteral().model;
      const referredType = this.type.primitiveType().referenceReferredType;

      const refSet = new Set();

      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1);
      const ref = refSet.values().next().value;

      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType, ref) as InMemoryCollection;
      }

      const retrieveItem = async item => {
        const ref = item.value;
        return this._backingStore.get(ref.id);
      };

      return await Promise.all(items.map(retrieveItem));
    }
    return this.toLiteral().model.map(item => item.value);
  }

  async get(id) {
    if (this.type.primitiveType().isReference) {
      const ref = this._model.getValue(id);
      if (ref == null) {
        return null;
      }
      const referredType = this.type.primitiveType().referenceReferredType;
      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType.collectionOf(), ref.storageKey) as InMemoryCollection;
      }
      const result = await this._backingStore.get(ref.id);
      return result;
    }
    return this._model.getValue(id);
  }

  traceInfo() {
    return {items: this._model.size};
  }

  async store(value, keys, originatorId=null) {
    assert(keys != null && keys.length > 0, 'keys required');
    const trace = Tracing.start({cat: 'handle', name: 'InMemoryCollection::store', args: {name: this.name}});

    if (this.type.primitiveType().isReference) {
      const referredType = this.type.primitiveType().referenceReferredType;
      if (this._backingStore == null) {
        this._backingStore =
            await this._storageEngine.baseStorageFor(referredType);
      }
      this._backingStore.store(value, [this.storageKey]);
      value = {id: value.id, storageKey: this._backingStore.storageKey};
    }

    const effective = this._model.add(value.id, value, keys);
    this.version++;
    await trace.wait(
        this._fire('change', {add: [{value, keys, effective}], version: this.version, originatorId}));
    trace.end({args: {value}});
  }

  async remove(id, keys=[], originatorId=null) {
    const trace = Tracing.start({cat: 'handle', name: 'InMemoryCollection::remove', args: {name: this.name}});
    if (keys.length === 0) {
      keys = this._model.getKeys(id);
    }
    const value = this._model.getValue(id);
    if (value !== null) {
      const effective = this._model.remove(id, keys);
      this.version++;
      await trace.wait(
          this._fire('change', {remove: [{value, keys, effective}], version: this.version, originatorId}));
    }
    trace.end({args: {entity: value}});
  }

  clearItemsForTesting() {
    this._model = new CrdtCollectionModel();
  }
}

class InMemoryVariable extends InMemoryStorageProvider {
  _storageEngine: InMemoryStorage;
  _stored: {id: string};
  _backingStore: InMemoryCollection;
  constructor(type: Type,
              storageEngine: InMemoryStorage,
              name: string,
              id: string,
              key: string) {
    super(type, name, id, key);
    this._storageEngine = storageEngine;
    this._stored = null;
    this._backingStore = null;
  }

  clone() {
    const variable = new InMemoryVariable(this.type, this._storageEngine, this.name, this.id, null);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle) {
    const literal = await handle.toLiteral();
    await this.fromLiteral(literal);
  }

  // Returns {version, model: [{id, value}]}
  async toLiteral() {
    const value = this._stored;
    let model = [];
    if (value != null) {
      model = [{
        id: value.id,
        value,
      }];
    }
    return {
      version: this.version,
      model,
    };
  }

  fromLiteral({version, model}) {
    const value = model.length === 0 ? null : model[0].value;
    assert(value !== undefined);
    this._stored = value;
    this.version = version;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  async get() {
    if (this.type.isReference) {
      const value = this._stored as {id: string, storageKey: string};
      const referredType = this.type.referenceReferredType;
      // TODO: string version of ReferredTyped as ID?
      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType.collectionOf(), value.storageKey) as InMemoryCollection;
      }
      const result = await this._backingStore.get(value.id);
      return result;
    }
    return this._stored;
  }

  async set(value : {id: string}, originatorId=null, barrier=null) {
    assert(value !== undefined);
    if (this.type.isReference) {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      // TODO(shans): Make sure this is tested.
      if (this._stored && this._stored.id === value.id && barrier === null) {
        return;
      }

      const referredType = this.type.referenceReferredType;
      if (this._backingStore == null) {
        this._backingStore =
            await this._storageEngine.baseStorageFor(referredType);
      }
      this._backingStore.store(value, [this.storageKey]);
      this._stored = {id: value.id, storageKey: this._backingStore.storageKey} as {id: string};
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      if (JSON.stringify(this._stored) === JSON.stringify(value) &&
          barrier === null) {
        return;
      }
      this._stored = value;
    }
    this.version++;
    await this._fire('change', {data: this._stored, version: this.version, originatorId, barrier});
  }

  async clear(originatorId=null, barrier=null) {
    this.set(null, originatorId, barrier);
  }
}
