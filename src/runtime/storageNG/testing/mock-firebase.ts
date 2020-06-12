/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {firebase, FirebaseStorageKey, FirebaseStorageDriverProvider, FirebaseDriver, FirebaseAppCache, FirebaseStorageKeyOptions} from '../drivers/firebase.js';
import {StorageKey} from '../storage-key.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Exists} from '../drivers/driver.js';
import {assert} from '../../../platform/chai-web.js';
import {RuntimeCacheService} from '../../runtime-cache.js';
import {StorageKeyParser} from '../storage-key-parser.js';
// import {Capabilities} from '../../capabilities.js';
// import {CapabilitiesResolver} from '../../capabilities-resolver.js';
import {StorageKeyOptions} from '../../storage-key-factory.js';

/**
 * These classes are intended to mimic firebase behaviour, including asynchrony.
 *
 * It's OK for methods in these classes to throw an Error if they're not implemented
 * yet; it isn't OK for methods to have different behaviour to the firebase API apart
 * from this.
 *
 * It's OK to add **simple** getXXXForTesting methods, to allow tests to "peek" at
 * stored values. It isn't OK to store complex chains of expectations ala gmock.
 */
class MockFirebaseDataSnapshot implements firebase.database.DataSnapshot {
  ref: MockFirebaseReference;
  key: string;

  constructor(reference: MockFirebaseReference) {
    this.ref = reference;
  }
  child(path: string): firebase.database.DataSnapshot {
    throw new Error('Method not implemented.');
  }
  exists(): boolean {
    return this.ref.value.value !== null;
  }
  exportVal() {
    throw new Error('Method not implemented.');
  }
  forEach(action: (a: firebase.database.DataSnapshot) => boolean | void): boolean {
    throw new Error('Method not implemented.');
  }
  getPriority(): string | number {
    throw new Error('Method not implemented.');
  }
  hasChild(path: string): boolean {
    throw new Error('Method not implemented.');
  }
  hasChildren(): boolean {
    throw new Error('Method not implemented.');
  }
  numChildren(): number {
    throw new Error('Method not implemented.');
  }
  val() {
    return this.ref.value.value;
  }
  toJSON(): {} {
    throw new Error('Method not implemented.');
  }
}

function clone(value: {}) {
  if (value == null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}

class MockFirebaseReference implements firebase.database.Reference {
  key: string;
  root: firebase.database.Reference;
  parent: firebase.database.Reference;
  value: {value: {}};
  backingValue: {value: {}};
  callbacks: ((a: firebase.database.DataSnapshot, b?: string) => void)[] = [];
  database: MockFirebaseDatabase;

  constructor(database: MockFirebaseDatabase, path: string, value: {value: {}}) {
    this.key = path;
    this.backingValue = value;
    this.value = {value: clone(this.backingValue.value)};
    this.database = database;
  }

  child(path: string): firebase.database.Reference {
    throw new Error('Method not implemented.');
  }
  onDisconnect(): firebase.database.OnDisconnect {
    throw new Error('Method not implemented.');
  }
  push(value?: unknown, onComplete?: (a: Error) => void): firebase.database.ThenableReference {
    throw new Error('Method not implemented.');
  }
  async remove(onComplete?: (a: Error) => void) {
    throw new Error('Method not implemented.');
  }
  async set(value: unknown, onComplete?: (a: Error) => void) {
    throw new Error('Method not implemented.');
  }
  async setPriority(priority: string | number, onComplete: (a: Error) => void) {
    throw new Error('Method not implemented.');
  }
  async setWithPriority(newVal: unknown, newPriority: string | number, onComplete?: (a: Error) => void) {
    throw new Error('Method not implemented.');
  }
  async transaction(transactionUpdate: (a: {}) => {}, onComplete?: (a: Error, b: boolean, c: firebase.database.DataSnapshot) => void, applyLocally?: boolean) {
    const result = transactionUpdate(this.value.value);
    if (result == undefined) {
      if (onComplete) {
        onComplete(null, false, await this.once('value'));
      }
      return {committed: false};
    }
    const snapshot = new MockFirebaseDataSnapshot(this);
    this.callbacks.forEach(callback => callback(snapshot));
    await 0;
    const backingResult = transactionUpdate(this.backingValue.value);
    if (backingResult == undefined) {
      if (onComplete) {
        onComplete(null, false, await this.once('value'));
      }
      const snapshot = await this.once('value');
      this.callbacks.forEach(callback => callback(snapshot));
      return {committed: false};
    }
    this.backingValue.value = backingResult;
    if (1) {
      // TODO: should only invoke callback here if backingResult is different
      // to result.
      const snapshot = await this.once('value');
      this.callbacks.forEach(callback => callback(snapshot));
    }
    await this.database.propagateUpdate(this.key, this);
    this.value.value = clone(backingResult);
    await 0;

    if (onComplete) {
      onComplete(null, true, snapshot);
    }

    await 0;

    return {committed: true};
  }

  async remoteStateChanged() {
    this.value.value = this.backingValue.value;
    const snapshot = await this.once('value');
    this.callbacks.forEach(callback => callback(snapshot));
  }

  async update(values: {}, onComplete?: (a: Error) => void) {
    throw new Error('Method not implemented.');
  }
  endAt(value: string | number | boolean, key?: string): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  equalTo(value: string | number | boolean, key?: string): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  isEqual(other: firebase.database.Query): boolean {
    throw new Error('Method not implemented.');
  }
  limitToFirst(limit: number): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  limitToLast(limit: number): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  off(eventType?: firebase.database.EventType,
      callback?: (a: firebase.database.DataSnapshot, b?: string) => void,
      context?: {}): void {
    throw new Error('Method not implemented.');
  }

  on(eventType: firebase.database.EventType,
     callback: (a: firebase.database.DataSnapshot, b?: string) => void,
     cancelCallbackOrContext?: {},
     context?: {}): (a: firebase.database.DataSnapshot, b?: string) => void {
    this.callbacks.push(callback);
    return callback;
  }

  async once(eventType: firebase.database.EventType,
       successCallback?: (a: firebase.database.DataSnapshot, b?: string) => void,
       failureCallbackOrContext?: {} | ((a: Error) => void),
       context?: {}): Promise<firebase.database.DataSnapshot> {
    await 0;
    this.value.value = clone(this.backingValue.value);
    return new MockFirebaseDataSnapshot(this);
  }
  orderByChild(path: string): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  orderByKey(): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  orderByPriority(): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  orderByValue(): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  ref: firebase.database.Reference;
  startAt(value: string | number | boolean, key?: string): firebase.database.Query {
    throw new Error('Method not implemented.');
  }
  toJSON(): {} {
    throw new Error('Method not implemented.');
  }
  toString(): string {
    throw new Error('Method not implemented.');
  }
}

class MockFirebaseDatabase implements firebase.database.Database {

  app: firebase.app.App;

  values = {};
  refs: {[index: string]: MockFirebaseReference[]} = {};

  constructor(app: MockFirebaseApp) {
    this.app = app;
  }

  async propagateUpdate(path: string, fromReference: MockFirebaseReference) {
    for (const reference of this.refs[path]) {
      if (reference === fromReference) {
        continue;
      }
      await reference.remoteStateChanged();
    }
  }

  getValueForTesting(path: string) {
    return this.values[path].value;
  }

  goOffline() {
    throw new Error('Method not implemented.');
  }
  goOnline() {
    throw new Error('Method not implemented.');
  }
  ref(path?: string): firebase.database.Reference {
    if (path == undefined) {
      path = '';
    }
    if (this.values[path] == undefined) {
      this.values[path] = {value: null};
      this.refs[path] = [];
    }
    // CONFIRMED: ref() calls with the same path return
    // unique Reference objects when using the real firebase API.
    const reference = new MockFirebaseReference(this, path, this.values[path]);
    this.refs[path].push(reference);
    return reference;
  }
  refFromURL(url: string): firebase.database.Reference {
    throw new Error('Method not implemented.');
  }
}

class MockFirebaseApp implements firebase.app.App {
  name: string;
  options: {};
  databases: {[index: string]: MockFirebaseDatabase} = {};

  constructor(key: FirebaseStorageKey) {
    this.options = key;
  }

  auth(): firebase.auth.Auth {
    throw new Error('Method not implemented.');
  }
  database(url?: string): firebase.database.Database {
    if (url == undefined) {
      url = '';
    }
    // CONFIRMED: database requests with the same url provide the
    // same object when using the real firebase API.
    if (!this.databases[url]) {
      this.databases[url] = new MockFirebaseDatabase(this);
    }
    return this.databases[url];
  }

  getValueForTesting(url: string, path: string) {
    return this.databases[url].getValueForTesting(path);
  }

  async delete() {
    throw new Error('Method not implemented.');
  }
  installations(): firebase.installations.Installations {
    throw new Error('Method not implemented.');
  }
  messaging(): firebase.messaging.Messaging {
    throw new Error('Method not implemented.');
  }
  storage(url?: string): firebase.storage.Storage {
    throw new Error('Method not implemented.');
  }
  firestore(): firebase.firestore.Firestore {
    throw new Error('Method not implemented.');
  }
  functions(region?: string): firebase.functions.Functions {
    throw new Error('Method not implemented.');
  }
  performance(): firebase.performance.Performance {
    throw new Error('Method not implemented.');
  }
}

class MockFirebaseAppCache extends FirebaseAppCache {
  getApp(key: FirebaseStorageKey) {
    assert.strictEqual(key.domain, 'test.domain');
    const keyAsString = key.toString();
    if (!this.appCache.has(keyAsString)) {
      this.appCache.set(keyAsString, new MockFirebaseApp(key));
    }
    return this.appCache.get(keyAsString);
  }
}

export class MockFirebaseStorageDriverProvider extends FirebaseStorageDriverProvider {
  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    if (!this.willSupport(storageKey)) {
      throw new Error(`This provider does not support storageKey ${storageKey.toString()}`);
    }

    return MockFirebaseStorageDriverProvider.newDriverForTesting<Data>(this.cacheService, storageKey, exists);
  }

  static async newDriverForTesting<Data>(cacheService: RuntimeCacheService, storageKey: StorageKey, exists: Exists) {
    const driver = new FirebaseDriver<Data>(storageKey, exists);
    const appCache = new MockFirebaseAppCache(cacheService);
    await driver.init(appCache);
    return driver;
  }

  static register(cacheService: RuntimeCacheService) {
    DriverFactory.register(new MockFirebaseStorageDriverProvider(cacheService));
    StorageKeyParser.addParser(FirebaseStorageKey.protocol, FirebaseStorageKey.fromString);
    const {projectId, domain, apiKey} = mockFirebaseStorageKeyOptions;
    // CapabilitiesResolver.registerKeyCreator(
    //     'firebase',
    //     Capabilities.persistentQueryable,
    //     (options: StorageKeyOptions) => new FirebaseStorageKey(projectId, domain, apiKey, options.location()));


    // ***************************************
    // ??? NEEDS SMTH FOR NEW CAPABILITIES ???
    // ***************************************
  }

  static getValueForTesting(cacheService: RuntimeCacheService, storageKey: MockFirebaseStorageKey) {
    const appCache = new MockFirebaseAppCache(cacheService);
    const app = (appCache.getApp(storageKey) as MockFirebaseApp);
    return app.getValueForTesting('', storageKey.location);
  }
}

export class MockFirebaseStorageKey extends FirebaseStorageKey {
  constructor(location) {
    super('test-project', 'test.domain', 'testKey', location);
  }
}

export const mockFirebaseStorageKeyOptions: FirebaseStorageKeyOptions = {
  projectId: 'test-project',
  domain: 'test.domain',
  apiKey: 'testKey'
};
