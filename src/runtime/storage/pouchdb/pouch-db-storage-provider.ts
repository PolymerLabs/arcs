/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PouchDB} from '../../../../concrete-storage/pouchdb.js';
import {Type} from '../../type.js';
import {Runnable} from '../../hot.js';
import {StorageProviderBase} from '../storage-provider-base.js';
import {PouchDbCollection} from './pouch-db-collection.js';
import {PouchDbKey} from './pouch-db-key.js';
import {PouchDbStorage} from './pouch-db-storage.js';

/**
 * Base class for PouchDb related Storage classes
 * (PouchDbSingleton/PouchDbCollection)
 */
export abstract class PouchDbStorageProvider extends StorageProviderBase {
  /** The Storage Engine instance we were initialized with */
  protected storageEngine: PouchDbStorage;

  // Manages backing store
  backingStore: PouchDbCollection | null = null;
  private pendingBackingStore?: Promise<PouchDbCollection>;

  /** The PouchDbKey for this Collection */
  protected readonly pouchDbKey: PouchDbKey;

  // All public methods must call `await initialized` to avoid race
  // conditions on initialization.
  protected readonly initialized: Promise<void>;
  protected resolveInitialized: Runnable;

  protected constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string, refMode: boolean) {
    super(type, name, id, key);
    this.storageEngine = storageEngine;
    this.pouchDbKey = new PouchDbKey(key);
    this.referenceMode = refMode;
    this.initialized = new Promise(resolve => this.resolveInitialized = resolve);
  }

  // A consequence of awaiting this function is that this.backingStore
  // is guaranteed to exist once the await completes. This is because
  // if backingStore doesn't yet exist, the assignment in the then()
  // is guaranteed to execute before anything awaiting this function.
  async ensureBackingStore(): Promise<PouchDbCollection> {
    if (this.backingStore) {
      return this.backingStore;
    }
    if (!this.pendingBackingStore) {
      const key = this.storageEngine.baseStorageKey(this.backingType(), this.storageKey);
      this.pendingBackingStore = this.storageEngine.baseStorageFor(this.type, key);
      await this.pendingBackingStore.then(backingStore => (this.backingStore = backingStore));
    }
    return this.pendingBackingStore;
  }

  /**
   * The underlying type for the data.
   */
  abstract backingType(): Type;

  /**
   * The active database for this provider.
   */
  protected get db(): PouchDB.Database {
    return this.storageEngine.dbForKey(this.pouchDbKey);
  }

  /**
   * Called when the remote pouchdb server updates locally.
   */
  public abstract onRemoteStateSynced(doc: PouchDB.Core.ExistingDocument<{}>): void;

  /**
   * Increments the local version to be one more than the maximum of
   * the local and remove versions.
   */
  public bumpVersion(otherVersion: number = 0): void {
    this._version = Math.max(this._version, otherVersion) + 1;
  }
}
