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
  _typeMap: {[index: string]: PouchDbCollection};
  private typePromiseMap: {[index: string]: Promise<PouchDbCollection>};
  private localIDBase: number;

  private static replicationHandler: PouchDB.Replication.Replication<{}>|undefined;
  private static globaldb: PouchDB.Database;
  
  readonly db: PouchDB.Database;

  constructor(arcId: Id) {
    super(arcId);
    this._typeMap = {};
    this.localIDBase = 0;
    this.typePromiseMap = {};

    if (!PouchDbStorage.globaldb) {
      PouchDbStorage.globaldb = PouchDbStorage.setupDb();
    }
    
    this.db = PouchDbStorage.globaldb;
  }

  /**
   * Instantiates a new key for id/type stored at keyFragment
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
    if (PouchDbStorage.replicationHandler) {
      PouchDbStorage.replicationHandler.cancel();
    }
  }

  baseStorageKey(type: Type, keyString: string) : string {
    const key = new PouchDbKey(keyString);
    key.location = `backingStores/${type.toString()}`;
    return key.toString();
  }

  async baseStorageFor(type: Type, key : string) {
    if (this._typeMap[key]) {
      return this._typeMap[key];
    }
    if (this.typePromiseMap[key]) {
      return this.typePromiseMap[key];
    }
    const storagePromise = this._construct(type.toString(), type.collectionOf(), key) as Promise<PouchDbCollection>;
    this.typePromiseMap[key] = storagePromise;
    const storage = await storagePromise;
    assert(storage, `could not construct baseStorage for key ${key}`);
    this._typeMap[key] = storage;
    return storage;
  }

  parseStringAsKey(s: string) : PouchDbKey {
    return new PouchDbKey(s);
  }

  // TODO add 'must exist
  newProvider(type, storageEngine, name, id, key) : PouchDbStorageProvider {
    if (type.isCollection) {
      return new PouchDbCollection(type, storageEngine, name, id, key);
    }
    if (type.isBigCollection) {
      return new PouchDbBigCollection(type, storageEngine, name, id, key);
    }
    return new PouchDbVariable(type, storageEngine, name, id, key);
  }


  static async resetPouchDbStorageForTesting() {
    console.log('RESET storage for testing');
    const db = PouchDbStorage.setupDb();
    
    await db.allDocs({include_docs: true}).then(allDocs => {
      return allDocs.rows.map(row => {
        console.log("Deleting " + row.id + ' ' + row.doc._rev);
        return {_id: row.id, _rev: row.doc._rev, _deleted: true};
      });
    }).then(deleteDocs => {
      return db.bulkDocs(deleteDocs);
    });
  }


  static setupDb() {
    PouchDB.plugin(PouchDbMemory);

    // const dboptions = {
    //   fetch: function (url, opts) {
    //     console.log('PDF: fetching from ' + url);
    //     opts.headers.set('X-Some-Special-Header', 'foo');
    //     return PouchDB.fetch(url, opts);
    //   }
    // } as PouchDB.Configuration.DatabaseConfiguration;
    
    // TODO(lindner) replace with map.
    const memdb = new PouchDB('device', {adapter: 'memory'});
    const localDb = new PouchDB('device', {adapter: 'memory'});
    const remoteDb = new PouchDB('http://localhost:8080/user');
    
    if (!memdb || !localDb || !remoteDb) {
      throw new Error('error initializing database not defined!');
    }
    
    console.log('INITIALIZED DB');
    PouchDbStorage.replicationHandler = PouchDB.replicate(remoteDb, localDb, {live: true})
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
