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
import {PouchDbCollection} from "./pouch-db-collection.js";
import {PouchDbStorageProvider} from "./pouch-db-storage-provider.js";
import {PouchDbBigCollection} from "./pouch-db-big-collection.js";
import {PouchDbVariable} from "./pouch-db-variable.js";

import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';


export class PouchDbStorage extends StorageBase {
  // TODO(lindner) add global weak map of keys and handle replication events.

  // Used for reference mode
  private readonly baseStores: Map<Type, PouchDbCollection> = new Map();
  private readonly baseStorePromises: Map<Type, Promise<PouchDbCollection>> = new Map();
  private localIDBase: number;

  /** Global map of database types/name to Pouch Database Instances */
  private static DbLocationToInstance: Map<string, PouchDB.Database> = new Map();
  /** Tracks replication status and allows cancellation in tests */
  private static ReplicationHandler: PouchDB.Replication.Replication<{}>|undefined;

  constructor(arcId: Id) {
    super(arcId);
    this.localIDBase = 0;
  }

  /**
   * Instantiates a new key for id/type stored at keyFragment.
   */
  async construct(id: string, type: Type, keyFragment: string) : Promise<PouchDbStorageProvider> {
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

    // TODO(shanestephens): should pass in factory, not 'this' here.
    const provider = this.newProvider(type, this, undefined, id, key.toString());
    return provider;
  }

  /**
   * Connect with an existing storage key.  Returns a cached instance if available.
   * Returns null if no such storage key exists.
   */
  async connect(id: string, type: Type, key: string) : Promise<PouchDbStorageProvider> {
    const imKey = new PouchDbKey(key);

    // TODO(lindner): fail if not created.
    return this.construct(id, type, key);
  }

  // Unit tests should call this in an 'after' block.
  shutdown() {
    console.log("SHUTDOWN");
    if (PouchDbStorage.ReplicationHandler) {
      PouchDbStorage.ReplicationHandler.cancel();
    }
  }

  baseStorageKey(type: Type, keyString: string) : string {
    const key = new PouchDbKey(keyString);
    key.location = `backingStores/${type.toString()}`;
    return key.toString();
  }

  async baseStorageFor(type: Type, key : string) {
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

  parseStringAsKey(s: string) : PouchDbKey {
    return new PouchDbKey(s);
  }

  /** Ceates a new Variable or Colleciton given basic parameters */
  newProvider(type, storageEngine, name, id, key) : PouchDbStorageProvider {
    // TODO track keys...
   if (type.isCollection) {
      return new PouchDbCollection(type, storageEngine, name, id, key);
    }
    if (type.isBigCollection) {
      return new PouchDbBigCollection(type, storageEngine, name, id, key);
    }
    return new PouchDbVariable(type, storageEngine, name, id, key);
  }


  /** Removes everything that a test could have created. */
  static async resetPouchDbStorageForTesting() {
    console.log('RESET storage for testing');
    for (const db of PouchDbStorage.DbLocationToInstance.values()) {
      await db.allDocs({include_docs: true}).then(allDocs => {
        return allDocs.rows.map(row => {
          console.log("Deleting " + row.id + ' ' + row.doc._rev);
          return {_id: row.id, _rev: row.doc._rev, _deleted: true};
        });
      }).then(deleteDocs => {
        return db.bulkDocs(deleteDocs);
      });
    }
  }


  /**
   * Returns a database for the specific dbLocation/dbName of PouchDbKey and caches it.
   */
  public dbForKey(key: PouchDbKey): PouchDB.Database {
    let db = PouchDbStorage.DbLocationToInstance.get(key.dbCacheKey());

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
      // Remote database
      // TODO(lindner): sync local to remote instead of direct
      db = new PouchDB(key.dbName);
      const remoteDb = new PouchDB('http://' + key.dbLocation + '/' + key.dbName);
      if (!remoteDb || !db) {
        throw new Error('unable to connect to remote database for ' + key.toString());
      }
      this.setupReplication(db, remoteDb);
    }
    
    if (!db) {
      throw new Error("unable to connect to database for " + key.toString());
    }
    PouchDbStorage.DbLocationToInstance.set(key.dbCacheKey(), db);
    return db;
  }
  
  private setupReplication(localDb: PouchDB.Database, remoteDb: PouchDB.Database) {
    console.log('Replicating DBs');
    PouchDbStorage.ReplicationHandler = PouchDB.replicate(localDb, remoteDb, {live: true})
      .on('change', (info) => {
        // handle change
        console.log('XX change');
      }).on('paused', (err) => {
        // replication paused (e.g. replication up to date, user went offline)
        console.log('XX paused', err);
      }).on('active', () => {
        // replicate resumed (e.g. new changes replicating, user went back online)
        console.log('XX active');
      }).on('denied', (err) => {
        console.log('XX denied', err);
        // a document failed to replicate (e.g. due to permissions)
      }).on('complete', (info) => {
        console.log('XX complete', info);
        // handle complete
      }).on('error', (err) => {
        console.trace();
        console.log('XX error', err);
        // handle error
      });

    // db.changes({
    //   since: 'now',
    //   live: true,
    //   include_docs: true
    // }).on('change', (c) => {
    //   console.log('PDB change', c);
    // }).on('error', (c) => {
    //   console.log('PDB sync error', c);
    // });
    // TODO FIRE EVENTS for remote changes
    
    return remoteDb;
  }
}
