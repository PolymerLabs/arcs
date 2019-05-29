/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Driver, ReceiveMethod, StorageDriverProvider, Exists, DriverFactory} from './driver-factory.js';
import {StorageKey} from '../storage-key.js';

import {firebase} from '../../../platform/firebase-web.js';
import {Runtime} from '../../runtime.js';
import {assert} from '../../../platform/assert-web.js';

export class FirebaseStorageKey extends StorageKey {
  public readonly url: string;
  public readonly projectId: string;
  public readonly apiKey: string;
  public readonly location: string;

  constructor(url: string, projectId: string, apiKey: string, location: string) {
    super('firebase');
    this.url = url;
    this.projectId = projectId;
    this.apiKey = apiKey;
    this.location = location;
  }
}

class FirebaseAppCache {
  private appCache: Map<FirebaseStorageKey, firebase.app.App>;

  constructor(runtime: Runtime) {
    this.appCache = runtime.getCacheService().getOrCreateCache<FirebaseStorageKey, firebase.app.App>('firebase-driver');
  }

  getApp(key: FirebaseStorageKey) {
    if (!this.appCache.has(key)) {
      this.appCache.set(key, firebase.initializeApp(key));
    }
    return this.appCache.get(key);
  }
}

export class FirebaseDriver<Data> extends Driver<Data> {
  private receiver: ReceiveMethod<Data>;
  private appCache: FirebaseAppCache;
  storageKey: FirebaseStorageKey;
  private reference: firebase.database.Reference;

  async init() {
    this.appCache = new FirebaseAppCache(Runtime.getRuntime());

    const app = this.appCache.getApp(this.storageKey);
    const reference = firebase.database(app).ref(this.storageKey.location);
    const currentSnapshot = await reference.once('value');
    if (this.exists === Exists.ShouldCreate && currentSnapshot.exists) {
      throw new Error(`requested creation of memory location ${this.storageKey} can't proceed as location already exists`);
    }
    if (this.exists === Exists.ShouldExist && !currentSnapshot.exists) {
      throw new Error(`requested connection to memory location ${this.storageKey} can't proceed as location doesn't exist`);
    }

    if (!currentSnapshot.exists) {
      await reference.transaction(data => {
        if (data !== null) {
          return undefined;
        }
        return {version: 0};
      });
    }
      
    this.reference = reference;
  }

  registerReceiver(receiver: ReceiveMethod<Data>) {
    this.receiver = receiver;
  }
  
  async send(model: Data, version: number) {
    return true;
  }

  async write(key: StorageKey, value: Data) {
    throw new Error("Method not implemented.");
  }

  async read(key: StorageKey) {
    throw new Error("Method not implemented.");
  }
}


export class FirebaseStorageDriverProvider implements StorageDriverProvider {
  
  willSupport(storageKey: StorageKey): boolean {
    return storageKey.protocol === 'firebase';
  }
  
  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    if (!this.willSupport(storageKey)) {
      throw new Error(`This provider does not support storageKey ${storageKey.toString()}`);
    }
    
    const driver = new FirebaseDriver<Data>(storageKey, exists);
    await driver.init();
    return driver;
  }

  static register() {
    DriverFactory.register(new FirebaseStorageDriverProvider());
  }
}
