/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {PouchDB, PouchDbDebug, PouchDbMemory} from '../../../../concrete-storage/pouchdb.js';
import {Id} from '../../id.js';
import {ArcType, BigCollectionType, CollectionType, EntityType, ReferenceType, Type} from '../../type.js';
import {StorageBase} from '../storage-provider-base.js';
import {PouchDbBigCollection} from './pouch-db-big-collection.js';
import {PouchDbCollection} from './pouch-db-collection.js';
import {PouchDbKey} from './pouch-db-key.js';
import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';
import {PouchDbSingleton} from './pouch-db-singleton.js';
PouchDB.plugin(PouchDbDebug);
PouchDB.debug.disable();

export class PouchDbStorage extends StorageBase {
  /**
   * A map of the key location to the actual provider.
   * Used for replication callbacks and as a short-circuit for the connect method.
   */
  private readonly providerByLocationCache: Map<string, PouchDbStorageProvider> = new Map();

  // Used for reference mode
  private readonly baseStores: Map<Type, PouchDbCollection> = new Map();
  private readonly baseStorePromises: Map<Type, Promise<PouchDbCollection>> = new Map();

  /** Global map of database types/name to Pouch Database Instances */
  private static dbLocationToInstance: Map<string, PouchDB.Database> = new Map();

  /** Tracks replication status and allows cancellation in tests */
  private static syncHandler: PouchDB.Replication.Sync<{}> | undefined;

  constructor(arcId: Id) {
    super(arcId);
  }

  public set debug(d: boolean) {
    super.debug = d;
    if (d) {
      PouchDB.debug.enable('*');
    } else {
      PouchDB.debug.disable();
    }
  }

  /**
   * Determines if the given type is Reference Mode and sets it
   * accordingly.  Attempts to sidestep the hacky ways reference mode
   * changes outside of the storage subsystem.  The following items
   * will force reference mode to false:
   *
   * - ArcType, used for serialization
   * - EntityType used for Search/Suggestions
   * - ReferenceTypes
   * - TypeContainers that contain Reference Types.
   */
  private isTypeReferenceMode(type: Type) {
    if (type instanceof EntityType) {
      // Suggestions and Search are non-referenceMode
      const schema = type.getEntitySchema();
      if (schema.name === 'Suggestions' || schema.name === 'Search') {
        return false;
      }
    }
    if (type instanceof ArcType) {
      return false; // see arc.ts persistSerialization
    }

    if (type instanceof ReferenceType) {
      return false;
    }

    if (type.isTypeContainer() && type.getContainedType() instanceof ReferenceType) {
      return false;
    }
    return true;
  }


  /**
   * Instantiates a new key for id/type stored at keyFragment.
   */
  async construct(id: string, type: Type, keyFragment: string): Promise<PouchDbStorageProvider> {

    const refMode = this.isTypeReferenceMode(type);
    const provider = await this._construct(id, type, keyFragment, refMode);

    if (provider.referenceMode) {
      await provider.ensureBackingStore();
    }

    return provider;
  }

  async _construct(id: string, type: Type, keyFragment: string, refMode: boolean) {
    const key = new PouchDbKey(keyFragment);
    const provider = this.newProvider(type, undefined, id, key.toString(), refMode);

    // Used to track changes for the key.
    this.providerByLocationCache.set(key.location, provider);

    return provider;
  }

  /**
   * Connect with an existing storage key.  Returns a cached instance if available.
   * Returns null if no such storage key exists.
   */
  async connect(id: string, type: Type, key: string): Promise<PouchDbStorageProvider> {
    const pouchKey = new PouchDbKey(key);

    // Check if we have an already allocated instance
    const provider = this.providerByLocationCache.get(pouchKey.location);
    if (provider) {
      return provider;
    }

    // Use a simple fetch to see if the document exists
    try {
      // TODO(lindner): optimize away this call.
      await this.dbForKey(pouchKey).get(pouchKey.location);
      return this.construct(id, type, key);
    } catch (err) {
      if (err.name && err.name === 'not_found') {
        // connecting despite missing doc, returning null
        return null;
      }
      throw err;
    }
  }

  /** Unit tests should call this in an 'after' block. */
  async shutdown() {
    // Stop syncing
    if (PouchDbStorage.syncHandler) {
      PouchDbStorage.syncHandler.cancel();
    }
    // Close databases
    for (const db of PouchDbStorage.dbLocationToInstance.values()) {
      try {
        await db.close();
        await db.destroy();
      } catch (err) {
        // ignore already closed db
      }
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

    // Base Storage is not using Reference Mode
    const storagePromise = this._construct(type.toString(), type.collectionOf(), key, false) as Promise<PouchDbCollection>;

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

  /** Creates a new Singleton or Collection given basic parameters */
  newProvider(type: Type, name: string, id: string, key: string, refMode: boolean): PouchDbStorageProvider {
    if (type instanceof CollectionType) {
      return new PouchDbCollection(type, this, name, id, key, refMode);
    }
    if (type instanceof BigCollectionType) {
      return new PouchDbBigCollection(type, this, name, id, key, refMode);
    }
    return new PouchDbSingleton(type, this, name, id, key, refMode);
  }

  /** Removes everything that a test could have created. */
  static async resetPouchDbStorageForTesting(): Promise<void> {
    for (const db of PouchDbStorage.dbLocationToInstance.values()) {
      await db
        .allDocs({include_docs: true})
        .then(allDocs => {
          return allDocs.rows.map(row => {
            return {_id: row.id, _rev: row.doc._rev, _deleted: true};
          });
        })
        .then(async deleteDocs => {
          return db.bulkDocs(deleteDocs);
        });
    }
  }

  static async dumpDB() {
    for (const db of PouchDbStorage.dbLocationToInstance.values()) {
      await db
        .allDocs({include_docs: true})
        .then(allDocs => {
          console.log(allDocs);
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
      const dbUrl = `${httpScheme}${key.dbLocation}/${key.dbName}`;
      console.log('Connecting to ' + dbUrl);

      const remoteDb = new PouchDB(dbUrl);
      if (!remoteDb || !db) {
        throw new Error('unable to connect to remote database ' + dbUrl + ' for ' + key.toString());
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
          // Find the handler for the id and pass the changed doc to it.
          const handler = this.providerByLocationCache.get(doc._id);
          if (handler) {
            handler.onRemoteStateSynced(doc);
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
