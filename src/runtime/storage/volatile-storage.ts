/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Id} from '../id.js';
import {BigCollectionType, CollectionType, ReferenceType, Type} from '../type.js';
import {CrdtCollectionModel, ModelValue, SerializedModelEntry} from './crdt-collection-model.js';
import {KeyBase} from './key-base.js';
import {BigCollectionStorageProvider, ChangeEvent, CollectionStorageProvider, StorageBase, StorageProviderBase, SingletonStorageProvider} from './storage-provider-base.js';
import {Dictionary} from '../hot.js';
import {RuntimeCacheService} from '../runtime-cache.js';

export function resetVolatileStorageForTesting() {
  const cache = storageCache();
  for (const value of cache.values()) {
    value._memoryMap = {};
  }
}

class VolatileKey extends KeyBase {
  _arcId: string;

  constructor(key: string) {
    super();
    let parts = key.split('://');
    this.protocol = parts[0];
    assert(this.protocol === 'volatile' || this.protocol === 'ramdisk',
           `can't construct volatile key for protocol ${this.protocol} (input key ${key})`);
    parts = parts[1] ? parts.slice(1).join('://').split('^^') : [];
    this.arcId = parts[0];
    this.location = parts[1];
    assert(this.toString() === key, `Expected ${key}, but got ${this.toString()} volatile key base.`);
  }

  base(): string { return this.protocol; }
  get arcId(): string { return this._arcId; }
  set arcId(arcId: string) { this._arcId = arcId; }

  childKeyForHandle(id): VolatileKey {
    return new VolatileKey(this.protocol);
  }

  childKeyForArcInfo(): VolatileKey {
    return new VolatileKey(`${this.protocol}://${this.arcId}^^arc-info`);
  }

  childKeyForSuggestions(userId, arcId): KeyBase {
    return new VolatileKey(`${this.protocol}://${this.arcId}^^${userId}/suggestions/${arcId}`);
  }

  childKeyForSearch(userId): KeyBase {
    return new VolatileKey(`${this.protocol}://${this.arcId}^^${userId}/search`);
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

// Note the below is an inelegant method of setting the storage cache, but the old storage
// stack is deprecated and the new one is almost ready, so we just need something temporarily
// serviceable.
let storageCache: (() => Map<string, VolatileStorage>) = () => {
  throw new Error(`Attempt to use volatile storage cache before it's been set.`);
};

export class VolatileStorage extends StorageBase {
  _memoryMap: Dictionary<VolatileStorageProvider>;
  _typeMap: Dictionary<VolatileCollection>;
  private readonly typePromiseMap: Dictionary<Promise<VolatileCollection>>;
  localIDBase: number;

  static setStorageCache(cacheService: RuntimeCacheService) {
    storageCache = () => cacheService.getOrCreateCache<string, VolatileStorage>('volatileStorageCache');
  }

  constructor(arcId: Id) {
    super(arcId);
    this._memoryMap = {};
    this._typeMap = {};
    this.localIDBase = 0;
    this.typePromiseMap = {};
    // TODO(shans): re-add this assert once we have a runtime object to put it on.
    // assert(__storageCache[this._arc.id] == undefined, `${this._arc.id} already exists in local storage cache`);
    storageCache().set(this.arcId.toString(), this);
  }

  async construct(id: string, type: Type, keyFragment: string) : Promise<VolatileStorageProvider> {
    const provider = await this._construct(id, type, keyFragment);
    if (type instanceof ReferenceType || type instanceof BigCollectionType) {
      return provider;
    }
    if (type.isTypeContainer() && type.getContainedType() instanceof ReferenceType) {
      return provider;
    }
    provider.enableReferenceMode();
    return provider;
  }

  async _construct(id, type, keyFragment) {
    const key = this.constructKey(keyFragment);
    let provider = this._memoryMap[key];
    if (!provider) {
      // TODO(shanestephens): should pass in factory, not 'this' here.
      provider = VolatileStorageProvider.newProvider(type, this, undefined, id, key);
      this._memoryMap[key] = provider;
    }
    return provider;
  }

  constructKey(keyFragment: string): string {
    const key = new VolatileKey(keyFragment);
    if (key.arcId === undefined) {
      key.arcId = this.arcId.toString();
    }
    if (key.location === undefined) {
      key.location = 'volatile-' + this.localIDBase++;
    }
    return key.toString();
  }

  async connect(id: string, type: Type, key: string) : Promise<VolatileStorageProvider> {
    const imKey = new VolatileKey(key);
    if (imKey.arcId !== this.arcId.toString()) {
      if (storageCache().get(imKey.arcId) == undefined) {
        return null;
      }
      return storageCache().get(imKey.arcId).connect(id, type, key);
    }
    if (this._memoryMap[key] === undefined) {
      return null;
    }
    // TODO assert types match?
    return this._memoryMap[key];
  }

  baseStorageKey(type: Type) : string {
    const key = new VolatileKey('volatile');
    key.arcId = this.arcId.toString();
    key.location = 'volatile-' + type.toString();
    return key.toString();
  }

  async baseStorageFor(type: Type, key: string) {
    if (this._typeMap[key]) {
      return this._typeMap[key];
    }
    if (this.typePromiseMap[key]) {
      return this.typePromiseMap[key];
    }
    const storagePromise = this._construct(type.toString(), type.collectionOf(), key) as Promise<VolatileCollection>;
    this.typePromiseMap[key] = storagePromise;
    const storage = await storagePromise;
    assert(storage, `could not construct baseStorage for key ${key}`);
    this._typeMap[key] = storage;
    return storage;
  }

  parseStringAsKey(s: string) : VolatileKey {
    const key = new VolatileKey(s);
    if (key.arcId === undefined) {
      key.arcId = this.arcId.toString();
    }
    return key;
  }
}

export abstract class VolatileStorageProvider extends StorageProviderBase {
  backingStore: VolatileCollection|null = null;
  protected storageEngine: VolatileStorage;
  private pendingBackingStore: Promise<VolatileCollection>|null = null;
  static newProvider(type, storageEngine, name, id, key) {
    if (type instanceof CollectionType) {
      return new VolatileCollection(type, storageEngine, name, id, key);
    }
    if (type instanceof BigCollectionType) {
      return new VolatileBigCollection(type, storageEngine, name, id, key);
    }
    return new VolatileSingleton(type, storageEngine, name, id, key);
  }

  // A consequence of awaiting this function is that this.backingStore
  // is guaranteed to exist once the await completes. This is because
  // if backingStore doesn't yet exist, the assignment in the then()
  // is guaranteed to execute before anything awaiting this function.
  async ensureBackingStore() {
    if (this.backingStore) {
      return this.backingStore;
    }
    if (!this.pendingBackingStore) {
      const key = this.storageEngine.baseStorageKey(this.backingType());
      this.pendingBackingStore = this.storageEngine.baseStorageFor(this.backingType(), key);
      await this.pendingBackingStore.then(backingStore => this.backingStore = backingStore);
    }
    return this.pendingBackingStore;
  }

  abstract backingType(): Type;
  fromLiteral({version, model}) {}
}

export class VolatileCollection extends VolatileStorageProvider implements CollectionStorageProvider {
  _model: CrdtCollectionModel;
  constructor(type, storageEngine, name, id, key) {
    super(type, name, id, key);
    this._model = new CrdtCollectionModel();
    this.storageEngine = storageEngine;
    assert(this._version !== null);
  }

  backingType() {
    return this.type.getContainedType();
  }

  async clone() {
    const handle = new VolatileCollection(this.type, this.storageEngine, this.name, this.id, null);
    await handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle): Promise<void> {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.serializeContents();
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    this.fromLiteral(literal);
  }

  async modelForSynchronization() {
    const model = await this._toList();
    return {version: this._version, model};
  }

  // Returns {version, model: [{id, value, keys: []}]}
  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    return {version: this._version, model: this._model.toLiteral()};
  }

  fromLiteral({version, model}) {
    this._version = version;
    this._model = new CrdtCollectionModel(model);
  }

  async _toList(): Promise<SerializedModelEntry[]> {
    if (this.referenceMode) {
      const items = (await this.serializeContents()).model;
      if (items.length === 0) {
        return [];
      }
      const refSet = new Set();
      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1, `multiple storageKeys in reference set of collection not yet supported.`);
      const ref = refSet.values().next().value;

      await this.ensureBackingStore();

      const ids = items.map(item => item.value.id);
      const results = await this.backingStore.getMultiple(ids);
      const output: SerializedModelEntry[] = [];
      for (let i = 0; i < results.length; i++) {
        output.push({id: ids[i], value: results[i], keys: items[i].keys});
      }
      return output;
    }
    const literal = await this.serializeContents();
    return literal.model;
  }

  async toList(): Promise<ModelValue[]> {
    return (await this._toList()).map(item => item.value);
  }

  async getMultiple(ids: string[]) {
    assert(!this.referenceMode, 'getMultiple not implemented for referenceMode stores');
    return ids.map(id => this._model.getValue(id));
  }

  async storeMultiple(values, keys: string[], originatorId: string = null): Promise<void> {
    assert(!this.referenceMode, 'storeMultiple not implemented for referenceMode stores');
    values.map(value => this._model.add(value.id, value, keys));
    this._version++;
  }

  async fetchAll(id: string) {
    if (this.referenceMode) {
      const ref = this._model.getValue(id);
      if (ref == null) {
        return null;
      }
      await this.ensureBackingStore();
      return await this.backingStore.fetchAll(ref.id);
    }
    return this._model.getValue(id);
  }

  traceInfo() {
    return {items: this._model.size};
  }

  async store(value, keys, originatorId: string = null) {
    assert(keys != null && keys.length > 0, 'keys required');
    const item = {value, keys, effective: undefined};
    if (this.referenceMode) {
      const referredType = this.type.getContainedType();
      const storageKey = this.backingStore ? this.backingStore.storageKey : this.storageEngine.baseStorageKey(referredType);

      // It's important to store locally first, as the upstream consumers
      // are set up to assume all writes are processed (at least locally) synchronously.
      item.effective = this._model.add(value.id, {id: value.id, storageKey}, keys);
      await this.ensureBackingStore();
      await this.backingStore.store(value, keys);
    } else {
      item.effective = this._model.add(value.id, value, keys);
    }

    this._version++;
    await this._fire(new ChangeEvent({add: [item], version: this._version, originatorId}));
  }

  async removeMultiple(items, originatorId: string = null): Promise<void> {
    if (items.length === 0) {
      items = this._model.toList().map(item => ({id: item.id, keys: []}));
    }
    const remove = items.map(item => {
      const res: {id: string, keys: string[], value: {}, effective?: boolean} = {
        id: item.id,
        keys: item.keys.length ? item.keys : this._model.getKeys(item.id),
        value: this._model.getValue(item.id)
      };
      if (res.value !== null) {
        res.effective = this._model.remove(item.id, res.keys);
      }
      return res;
    });
    this._version++;

    await this._fire(new ChangeEvent({remove, version: this._version, originatorId}));
  }

  async remove(id, keys:string[] = [], originatorId=null) {
    if (keys.length === 0) {
      keys = this._model.getKeys(id);
    }
    const value = this._model.getValue(id);
    if (value !== null) {
      const effective = this._model.remove(id, keys);
      this._version++;
      await this._fire(new ChangeEvent({remove: [{value, keys, effective}], version: this._version, originatorId}));
    }
  }

  async clear() {
    this._model = new CrdtCollectionModel();
  }

  clearItemsForTesting() {
    this._model = new CrdtCollectionModel();
  }
}

export class VolatileSingleton extends VolatileStorageProvider implements SingletonStorageProvider {
  _stored: {id: string, storageKey?: string}|null;
  private localKeyId = 0;
  constructor(type, storageEngine, name, id, key) {
    super(type, name, id, key);
    this.storageEngine = storageEngine;
    this._stored = null;
    this.backingStore = null;
  }

  backingType() {
    return this.type;
  }

  async clone() {
    const singleton = new VolatileSingleton(this.type, this.storageEngine, this.name, this.id, null);
    await singleton.cloneFrom(this);
    return singleton;
  }

  async cloneFrom(handle): Promise<void> {
    this.referenceMode = handle.referenceMode;
    // TODO(shans): if the handle has local modifications then cloning can fail because
    // underlying backingStore data isn't yet available to be read. However, checking the
    // localModified flag and calling persistChanges is really not the correct way to
    // mitigate this problem - instead, the model provided by await handle.toLiteral() should
    // remove local modifications that haven't been persisted.
    if (handle.referenceMode && handle.localModified) {
      await handle._persistChanges();
    }
    const literal = await handle.serializeContents();
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    await this.fromLiteral(literal);
  }

  async modelForSynchronization() {
    if (this.referenceMode && this._stored !== null) {
      const value = this._stored as {id: string, storageKey: string};

      await this.ensureBackingStore();
      const result = await this.backingStore.fetchAll(value.id);
      return {
        version: this._version,
        model: [{id: value.id, value: result}]
      };
    }

    return super.modelForSynchronization();
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    const value = this._stored;
    // TODO: what should keys be set to?
    const model = (value != null) ? [{id: value.id, value, keys: []}] : [];
    return {version: this._version, model};
  }

  fromLiteral({version, model}: {version: number, model: SerializedModelEntry[]}) {
    const value = model.length === 0 ? null : model[0].value;
    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);
    this._stored = value;
    this._version = version;
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  async fetch() {
    if (this.referenceMode && this._stored) {
      const value = this._stored as {id: string, storageKey: string};

      await this.ensureBackingStore();
      return await this.backingStore.fetchAll(value.id);
    }
    return this._stored;
  }

  async set(value, originatorId: string = null, barrier: string = null): Promise<void> {
    assert(value !== undefined);
    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this.backingStore ? this.backingStore.storageKey : this.storageEngine.baseStorageKey(referredType);

      // It's important to store locally first, as the upstream consumers
      // are set up to assume all writes are processed (at least locally) synchronously.
      this._stored = {id: value.id, storageKey};

      await this.ensureBackingStore();

      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id.
      await this.backingStore.store(value, [this.storageKey + this.localKeyId++]);
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      if (JSON.stringify(this._stored) === JSON.stringify(value) &&
          barrier == null) {
        return;
      }
      this._stored = value;
    }
    this._version++;
    const data = this.referenceMode ? value : this._stored;
    await this._fire(new ChangeEvent({data, version: this._version, originatorId, barrier}));
  }

  async clear(originatorId: string = null, barrier: string = null): Promise<void> {
    await this.set(null, originatorId, barrier);
  }
}

// Volatile version of the BigCollection API; primarily for testing.
class VolatileCursor {
  public readonly version: number;
  private readonly pageSize: number;
  private data;

  constructor(version, data, pageSize, forward) {
    this.version = version;
    this.pageSize = pageSize;
    const copy = [...data];
    copy.sort((a, b) => a.index - b.index);
    this.data = copy.map(v => v.value);
    if (!forward) {
      this.data.reverse();
    }
  }

  async next() {
    if (this.data.length === 0) {
      return {done: true};
    }
    return {value: this.data.splice(0, this.pageSize), done: false};
  }

  close() {
    this.data = [];
  }
}

class VolatileBigCollection extends VolatileStorageProvider implements BigCollectionStorageProvider {
  private items: Map<string, {index: number, value: {}, keys: Dictionary<number>}>;
  private cursors: Map<number, VolatileCursor>;
  private cursorIndex: number;

  constructor(type, storageEngine, name, id, key) {
    super(type, name, id, key);
    this.items = new Map();
    this.cursors = new Map();
    this.cursorIndex = 0;
  }

  enableReferenceMode() {
    assert(false, 'referenceMode is not supported for BigCollection');
  }

  backingType() {
    return this.type.getContainedType();
  }

  async fetchAll(id: string) {
    const data = this.items.get(id);
    return (data !== undefined) ? data.value : null;
  }

  async store(value, keys: string[], originatorId?: string) {
    assert(keys != null && keys.length > 0, 'keys required');
    this._version++;

    if (!this.items.has(value.id)) {
      this.items.set(value.id, {index: null, value: null, keys: {}});
    }
    const data = this.items.get(value.id);
    data.index = this._version;
    data.value = value;
    keys.forEach(k => data.keys[k] = this._version);
  }

  async remove(id: string, keys?: string[], originatorId?: string) {
    this._version++;
    this.items.delete(id);
  }

  async stream(pageSize: number, forward = true) {
    assert(!isNaN(pageSize) && pageSize > 0);
    this.cursorIndex++;
    const cursor = new VolatileCursor(this._version, this.items.values(), pageSize, forward);
    this.cursors.set(this.cursorIndex, cursor);
    return this.cursorIndex;
  }

  async cursorNext(cursorId: number) {
    const cursor = this.cursors.get(cursorId);
    if (!cursor) {
      return {done: true};
    }
    const data = await cursor.next();
    if (data.done) {
      this.cursors.delete(cursorId);
    }
    return data;
  }

  async cursorClose(cursorId: number): Promise<void> {
    const cursor = this.cursors.get(cursorId);
    if (cursor) {
      this.cursors.delete(cursorId);
      cursor.close();
    }
  }

  cursorVersion(cursorId: number) {
    const cursor = this.cursors.get(cursorId);
    return cursor ? cursor.version : null;
  }

  async cloneFrom(handle): Promise<void> {
    // TODO: clone from non-volatile versions
    if (handle.items) {
      this.fromLiteral(handle.toLiteral());
    }
  }

  // Returns {version, model: [{id, index, value, keys: []}]}
  async serializeContents() {
    const model = [];
    for (const [id, {index, value, keys}] of this.items.entries()) {
      model.push({id, index, value, keys: Object.keys(keys)});
    }
    return {version: this._version, model};
  }

  fromLiteral({version, model}) {
    this._version = version;
    this.items.clear();
    for (const {id, index, value, keys} of model) {
      const adjustedKeys = {};
      for (const k of keys) {
        adjustedKeys[k] = index;
      }
      this.items.set(id, {index, value, keys: adjustedKeys});
    }
  }

  clearItemsForTesting() {
    this.items.clear();
  }
}
