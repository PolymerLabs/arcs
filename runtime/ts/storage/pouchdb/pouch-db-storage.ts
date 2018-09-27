// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../../platform/assert-web.js';
import {StorageBase, StorageProviderBase} from '../storage-provider-base.js';
import {PouchDbKey} from './pouch-db-key.js';
import {Id} from '../../id.js';
import {Type} from '../../type.js';
import {PouchDbCollection} from './pouch-db-collection.js';
import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';
import {PouchDbBigCollection} from './pouch-db-big-collection.js';
import {PouchDbVariable} from './pouch-db-variable.js';

import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';

export class PouchDbStorage extends StorageBase {
  // TODO(lindner) add global weak map of keys and handle replication events.
  private readonly remoteStateChangedHandlers: Map<string, PouchDbStorageProvider> = new Map();

  // Used for reference mode
  private readonly baseStores: Map<Type, PouchDbCollection> = new Map();
  private readonly baseStorePromises: Map<Type, Promise<PouchDbCollection>> = new Map();
  private localIDBase: number;

  /** Global map of database types/name to Pouch Database Instances */
  private static dbLocationToInstance: Map<string, PouchDB.Database> = new Map();

  /** Tracks replication status and allows cancellation in tests */
  private static syncHandler: PouchDB.Replication.Sync<{}> | undefined;

  constructor(arcId: Id) {
    super(arcId);
    this.localIDBase = 0;
  }

  /**
   * Instantiates a new key for id/type stored at keyFragment.
   */
  async construct(id: string, type: Type, keyFragment: string): Promise<PouchDbStorageProvider> {
    const provider = await this._construct(id, type, keyFragment);
    if (type.isReference) {
      return provider;
    }
    if (type.isTypeContainer() && type.getContainedType().isReference) {
      return provider;
    }
    provider.enableReferenceMode();
    return provider;
  }

  async _construct(id: string, type: Type, keyFragment: string) {
    const key = new PouchDbKey(keyFragment);
    const keystr = key.toString();

    const provider = this.newProvider(type, undefined, id, key.toString());

    // Used to track changes for the key.
    this.remoteStateChangedHandlers.set(key.location, provider);

    return provider;
  }

  /**
   * Connect with an existing storage key.  Returns a cached instance if available.
   * Returns null if no such storage key exists.
   */
  async connect(id: string, type: Type, key: string): Promise<PouchDbStorageProvider> {
    const imKey = new PouchDbKey(key);

    // TODO(lindner): fail if not created.
    return this.construct(id, type, key);
  }

  /** Unit tests should call this in an 'after' block. */
  shutdown() {
    // Stop syncing
    if (PouchDbStorage.syncHandler) {
      PouchDbStorage.syncHandler.cancel();
    }
    // Close databases
    for (const db of PouchDbStorage.dbLocationToInstance.values()) {
      db.close();
    }
    PouchDbStorage.dbLocationToInstance.clear();
  }

  /** @inheritDoc */
  baseStorageKey(type: Type, keyString: string): string {
    const key = new PouchDbKey(keyString);
    key.location = `backingStores/${type.toString()}`;
    return key.toString();
  }

  /** @inheritDoc */
  async baseStorageFor(type: Type, key: string) {
    if (this.baseStores.has(type)) {
      return this.baseStores.get(type);
    }
    if (this.baseStorePromises.has(type)) {
      return this.baseStorePromises.get(type);
    }

    const storagePromise = this._construct(type.toString(), type.collectionOf(), key) as Promise<PouchDbCollection>;

    this.baseStorePromises.set(type, storagePromise);
    const storage = await storagePromise;
    assert(storage, 'baseStorageFor should not fail');
    this.baseStores.set(type, storage);
    return storage;
  }

  /** @inheritDoc */
  parseStringAsKey(s: string): PouchDbKey {
    return new PouchDbKey(s);
  }

  /** Ceates a new Variable or Collection given basic parameters */
  newProvider(type: Type, name, id, key): PouchDbStorageProvider {
    if (type.isCollection) {
      return new PouchDbCollection(type, this, name, id, key);
    }
    if (type.isBigCollection) {
      return new PouchDbBigCollection(type, this, name, id, key);
    }
    return new PouchDbVariable(type, this, name, id, key);
  }

  /** Removes everything that a test could have created. */
  static async resetPouchDbStorageForTesting() {
    for (const db of PouchDbStorage.dbLocationToInstance.values()) {
      await db
        .allDocs({include_docs: true})
        .then(allDocs => {
          return allDocs.rows.map(row => {
            return {_id: row.id, _rev: row.doc._rev, _deleted: true};
          });
        })
        .then(deleteDocs => {
          return db.bulkDocs(deleteDocs);
        });
    }
  }

  /**
   * Returns a database for the specific dbLocation/dbName of PouchDbKey and caches it.
   * @param key the PouchDbKey used to obtain the cache key.
   */
  public dbForKey(key: PouchDbKey): PouchDB.Database {
    let db = PouchDbStorage.dbLocationToInstance.get(key.dbCacheKey());

    if (db) {
      return db;
    }

    // New connect to a database
    if (key.dbLocation === 'local') {
      db = new PouchDB(key.dbName);
    } else if (key.dbLocation === 'memory') {
      PouchDB.plugin(PouchDbMemory);
      db = new PouchDB(key.dbName, {adapter: 'memory'});
    } else {
      // Create a local db to sync to the remote
      db = new PouchDB(key.dbName);

      // Ensure a secure origin, http is okay for localhost, but other hosts need https
      const httpScheme = key.dbLocation.startsWith('localhost') ? 'http://' : 'https://';

      const remoteDb = new PouchDB(httpScheme + key.dbLocation + '/' + key.dbName);
      if (!remoteDb || !db) {
        throw new Error('unable to connect to remote database for ' + key.toString());
      }

      // Make an early explicit connection to the database to catch bad configurations
      remoteDb
        .info()
        .then(info => {
          console.log('Connected to Remote Database', info);
        })
        .catch(err => {
          console.warn('Error connecting to Remote Database', err);
        });

      this.setupSync(db, remoteDb);
    }

    if (!db) {
      throw new Error('unable to connect to database for ' + key.toString());
    }

    PouchDbStorage.dbLocationToInstance.set(key.dbCacheKey(), db);
    return db;
  }

  /**
   * Starts syncing between the remote and local Pouch databases.
   * Installs an event handler that propagates changes arriving from
   * remote to local objects using matching location IDs.
   */
  private setupSync(localDb: PouchDB.Database, remoteDb: PouchDB.Database) {
    console.log('Replicating DBs');

    const syncHandler = localDb.sync(remoteDb, {live: true, retry: true});

    // Handle inbound changes.
    syncHandler.on('change', info => {
      const dir = info.direction; // push or pull.
      if (dir === 'pull') {
        // handle change from the server
        for (const doc of info.change.docs) {
          const handler = this.remoteStateChangedHandlers.get(doc._id);
          if (handler) {
            // TODO(lindner): pass the doc into this method to avoid
            // extra round-trip fetches.
            handler.onRemoteStateSynced();
          }
        }
      }
    });

    // Set up remaining event handlers.
    syncHandler
      .on('paused', err => {
        // replication paused (e.g. replication up to date, user went offline)
        console.log('DB Replication paused', err);
      })
      .on('active', () => {
        // replicate resumed (e.g. new changes replicating, user went back online)
        console.log('DB Replication active');
      })
      .on('denied', err => {
        // a document failed to replicate (e.g. due to permissions)
        // TODO(lindner): we should do something here..
        console.log('DB Replication denied', err);
      })
      .on('complete', info => {
        console.log('DB Replication complete', info);
      })
      .on('error', err => {
        // TODO(lindner): we should do something here..
        console.log('DB Replication error', err);
      });

    PouchDbStorage.syncHandler = syncHandler;
  }
}
