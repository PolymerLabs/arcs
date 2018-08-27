// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/assert-web.js';
import {Tracing} from '../../../tracelib/trace.js';
import {StorageProviderBase} from './storage-provider-base.js';
import {KeyBase} from './key-base.js';
import {CrdtCollectionModel} from './crdt-collection-model.js';
import {Id} from '../id.js';
import {Type} from '../type.js';

export function resetInMemoryStorageForTesting() {
  for (const key of Object.keys(__storageCache)) {
    __storageCache[key]._memoryMap = {};
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
    assert(this.protocol === 'in-memory', `can't construct in-memory key for protocol ${this.protocol} (input key ${key})`);
    parts = parts[1] ? parts.slice(1).join('://').split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
    assert(this.toString() === key);
  }

  childKeyForHandle(id): InMemoryKey {
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

// tslint:disable-next-line: variable-name
const __storageCache = {};

export class InMemoryStorage {
  private readonly arcId: Id;
  _memoryMap: {[index: string]: InMemoryStorageProvider};
  _typeMap: {[index: string]: InMemoryCollection};
  private typePromiseMap: {[index: string]: Promise<InMemoryCollection>};
  localIDBase: number;

  constructor(arcId: Id) {
    assert(arcId !== undefined, 'Arcs with storage must have ids');
    this.arcId = arcId;
    this._memoryMap = {};
    this._typeMap = {};
    this.localIDBase = 0;
    this.typePromiseMap = {};
    // TODO(shans): re-add this assert once we have a runtime object to put it on.
    // assert(__storageCache[this._arc.id] == undefined, `${this._arc.id} already exists in local storage cache`);
    __storageCache[this.arcId.toString()] = this;
  }

  async construct(id, type, keyFragment) {
    const provider = await this._construct(id, type, keyFragment);
    provider.enableReferenceMode();
    return provider;
  }

  async _construct(id, type, keyFragment) {
    const key = new InMemoryKey(keyFragment);
    if (key.arcId == undefined) {
      key.arcId = this.arcId.toString();
    }
    if (key.location == undefined) {
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

  async connect(id, type, keyString) {
    const key = new InMemoryKey(keyString);
    if (key.arcId !== this.arcId.toString()) {
      if (__storageCache[key.arcId] == undefined) {
        return null;
      }
      return __storageCache[key.arcId].connect(id, type, keyString);
    }
    if (this._memoryMap[keyString] == undefined) {
      return null;
    }
    // TODO assert types match?
    return this._memoryMap[keyString];
  }

  async share(id, type, keyString) {
    assert(keyString, "Must provide valid keyString to connect to underlying data");
    const key = new InMemoryKey(keyString);
    assert(key.arcId === this.arcId.toString(), `key's arcId ${key.arcId} doesn't match this storageProvider's arcId ${this.arcId.toString()}`);
    if (this._memoryMap[keyString] == undefined) {
      return this._construct(id, type, keyString);
    }
    return this._memoryMap[keyString];
  }

  baseStorageKey(type) : string {
    const key = new InMemoryKey('in-memory');
    key.arcId = this.arcId.toString();
    key.location = 'in-memory-' + type.toString();
    return key.toString();
  }

  async baseStorageFor(type, key : string) {
    if (this._typeMap[key]) {
      return this._typeMap[key];
    }
    if (this.typePromiseMap[key]) {
      return this.typePromiseMap[key];
    }
    const storagePromise = this._construct(type.toString(), type.collectionOf(), key) as Promise<InMemoryCollection>;
    this.typePromiseMap[key] = storagePromise;
    const storage = await storagePromise;
    this._typeMap[key] = storage;
    return storage;
  }

  parseStringAsKey(s: string) {
    return new InMemoryKey(s);
  }

  shutdown() {
    // No-op
  }
}

abstract class InMemoryStorageProvider extends StorageProviderBase {
  static newProvider(type, storageEngine, name, id, key) {
    if (type.isCollection) {
      return new InMemoryCollection(type, storageEngine, name, id, key);
    }
    if (type.isBigCollection) {
      return new InMemoryBigCollection(type, storageEngine, name, id, key);
    }
    return new InMemoryVariable(type, storageEngine, name, id, key);
  }
}

class InMemoryCollection extends InMemoryStorageProvider {
  _model: CrdtCollectionModel;
  _storageEngine: InMemoryStorage;
  _backingStore: InMemoryCollection|null;
  constructor(type, storageEngine, name, id, key) {
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
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    if (this.referenceMode && literal.model.length > 0) {
      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.baseStorageFor(this.type, this._storageEngine.baseStorageKey(this.type));
        literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this._backingStore.storageKey}}));
        const underlying = await handle._backingStore.getMultiple(literal.model.map(({id}) => id));
        await this._backingStore.storeMultiple(underlying, [this.storageKey]);
      }
    }
    this.fromLiteral(literal);
  }

  async modelForSynchronization() {
    return {
      version: this.version,
      model: await this._toList()
    };
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

  async _toList() {
    if (this.referenceMode) {
      const items = this.toLiteral().model;
      if (items.length === 0) {
        return [];
      }
      const referredType = this.type.primitiveType();

      const refSet = new Set();
      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1, `multiple storageKeys in reference set of collection not yet supported.`);
      const ref = refSet.values().next().value;

      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.share(referredType.toString(), referredType, ref) as InMemoryCollection;
      }

      const retrieveItem = async item => {
        const ref = item.value;
        return {id: ref.id, value: await this._backingStore.get(ref.id), keys: item.keys};
      };

      return await Promise.all(items.map(retrieveItem));
    }
    return this.toLiteral().model;
  }

  async toList() {
    return (await this._toList()).map(item => item.value);
  }

  async getMultiple(ids) {
    assert(!this.referenceMode, "getMultiple not implemented for referenceMode stores");
    return ids.map(id => this._model.getValue(id));
  }

  async storeMultiple(values, keys, originatorId=null) {
    assert(!this.referenceMode, "storeMultiple not implemented for referenceMode stores");
    values.map(value => this._model.add(value.id, value, keys));
    this.version++;
  }

  async get(id) {
    if (this.referenceMode) {
      const ref = this._model.getValue(id);
      if (ref == null) {
        return null;
      }
      const referredType = this.type.primitiveType();
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

    const changeEvent = {value, keys, effective: undefined};
    if (this.referenceMode) {
      const referredType = this.type.primitiveType();

      const storageKey = this._backingStore ? this._backingStore.storageKey : this._storageEngine.baseStorageKey(referredType);

      // It's important to store locally first, as the upstream consumers
      // are set up to assume all writes are processed (at least locally) synchronously.
      changeEvent.effective = this._model.add(value.id, {id: value.id, storageKey}, keys);

      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.baseStorageFor(referredType, storageKey);
        assert(this._backingStore !== this, "A store can't be its own backing store");
      }

      await this._backingStore.store(value, keys);
    } else {
      changeEvent.effective = this._model.add(value.id, value, keys);
    }

    this.version++;

    await trace.wait(
        this._fire('change', {add: [changeEvent], version: this.version, originatorId}));
    trace.end({args: {value}});
  }

  async remove(id, keys:string[] = [], originatorId=null) {
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
  _stored: {id: string}|null;
  _backingStore: InMemoryCollection|null;
  private localKeyId = 0;
  constructor(type, storageEngine, name, id, key) {
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
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    if (this.referenceMode && literal.model.length > 0) {
      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.baseStorageFor(this.type, this._storageEngine.baseStorageKey(this.type));
        literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this._backingStore.storageKey}}));
        const underlying = await handle._backingStore.getMultiple(literal.model.map(({id}) => id));
        await this._backingStore.storeMultiple(underlying, [this.storageKey]);
      }
    }
    await this.fromLiteral(literal);
  }

  async modelForSynchronization() {
    if (this.referenceMode && this._stored !== null) {
      const value = this._stored as {id: string, storageKey: string};

      if (this._backingStore == null) {
        this._backingStore = await this._storageEngine.share(this.type.toString(), this.type.collectionOf(), value.storageKey) as InMemoryCollection;
      }
      const result = await this._backingStore.get(value.id);
      return {
        version: this.version,
        model: [{id: value.id, value: result}]
      };
    }
    
    return super.modelForSynchronization();
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
    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);
    this._stored = value;
    this.version = version;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  async get() {
    if (this.referenceMode && this._stored) {
      const value = this._stored as {id: string, storageKey: string};

      const referredType = this.type;
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
    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this._backingStore ? this._backingStore.storageKey : this._storageEngine.baseStorageKey(referredType);

      // It's important to store locally first, as the upstream consumers
      // are set up to assume all writes are processed (at least locally) synchronously.
      this._stored = {id: value.id, storageKey} as {id: string};

      if (this._backingStore == null) {
        this._backingStore =
            await this._storageEngine.baseStorageFor(referredType, storageKey);
      }
      
      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id. 
      await this._backingStore.store(value, [this.storageKey + this.localKeyId++]);
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      if (JSON.stringify(this._stored) === JSON.stringify(value) &&
          barrier == null) {
        return;
      }
      this._stored = value;
    }
    this.version++;
    if (this.referenceMode) {
      await this._fire('change', {data: value, version: this.version, originatorId, barrier});
    } else {
      await this._fire('change', {data: this._stored, version: this.version, originatorId, barrier});
    }
  }

  async clear(originatorId=null, barrier=null) {
    await this.set(null, originatorId, barrier);
  }
}

// In-memory version of the BigCollection API; primarily for testing.
class InMemoryBigCollection extends InMemoryStorageProvider {
  protected version: number;
  private items: Map<string, {index: number, value: {}, keys: {[index: string]: number}}>;

  constructor(type, storageEngine, name, id, key) {
    super(type, name, id, key);
    this.version = 0;
    this.items = new Map();
  }

  async get(id) {
    const data = this.items.get(id);
    return (data !== undefined) ? data.value : null;
  }

  async store(value, keys) {
    assert(keys != null && keys.length > 0, 'keys required');
    this.version++;

    if (!this.items.has(value.id)) {
      this.items.set(value.id, {index: null, value: null, keys: {}});
    }
    const data = this.items.get(value.id);
    data.index = this.version;
    data.value = value;
    keys.forEach(k => data.keys[k] = this.version);
    return data;
  }

  async remove(id) {
    this.version++;
    this.items.delete(id);
  }

  async stream(pageSize: number) {
    assert(!isNaN(pageSize) && pageSize > 0);
    let copy = [...this.items.values()];
    copy.sort((a, b) => a.index - b.index);
    return {
      version: this.version,

      async next() {
        if (copy.length === 0) {
          return {done: true};
        }
        return {value: copy.splice(0, pageSize).map(v => v.value), done: false};
      },

      async close() {
        copy = [];
      }
    };
  }

  toLiteral() {
    assert(false, "no toLiteral implementation for BigCollection");
  }
}
