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
import {InMemoryKey} from '../in-memory-storage.js';

import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';

function setupDb() {
  PouchDB.plugin(PouchDbMemory);
  const db = new PouchDB('device', {adapter: 'memory'});
//  const db = new PouchDB('device');
  if (!db) {
    throw new Error('db not defined!');
  }
  // console.log('INITIALIZED DB');
  // PouchDB.replicate(db, 'http://localhost:5984/device',
  //                          {live: true, retry: true });
  //  db.changes({
  //    since: 'now',
  //    live: true,
  //    include_docs: true
  //  }).on('change', (c) => {console.log('change', c);
  //  }).on('error', (c) => {console.log('error', c);});
  // TODO FIRE EVENTS for remote changes

  return db;
}

export async function resetPouchDbStorageForTesting() {
  console.log('RESET storage for testing');
  const db = setupDb();

  for (const key of Object.keys(__storageCache)) {
    __storageCache[key]._memoryMap = {};
  }

  await db.allDocs({include_docs: true}).then(allDocs => {
    return allDocs.rows.map(row => {
      console.log("Deleting " + row.id + ' ' + row.doc._rev);
      return {_id: row.id, _rev: row.doc._rev, _deleted: true};
    });
  }).then(deleteDocs => {
    return db.bulkDocs(deleteDocs);
  });
}

// tslint:disable-next-line: variable-name
const __storageCache = {};

export class PouchDbMemoryStorage extends StorageBase {
  _memoryMap: {[index: string]: PouchDbStorageProvider};
  _typeMap: {[index: string]: PouchDbCollection};
  private typePromiseMap: {[index: string]: Promise<PouchDbCollection>};
  localIDBase: number;

  readonly db: PouchDB.Database;

  constructor(arcId: Id) {
    super(arcId);
    this._memoryMap = {};
    this._typeMap = {};
    this.localIDBase = 0;
    this.typePromiseMap = {};

    this.db = setupDb();
    // TODO(shans): re-add this assert once we have a runtime object to put it on.
    // assert(__storageCache[this._arc.id] == undefined, `${this._arc.id} already exists in local storage cache`);
    __storageCache[this.arcId.toString()] = this;
  }

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

  async _construct(id, type, keyFragment) {
    const key = new InMemoryKey(keyFragment);
    if (key.arcId == undefined) {
      key.arcId = this.arcId.toString();
    }
    if (key.location == undefined) {
      key.location = 'in-memory-' + this.localIDBase++;
    }
    // TODO(shanestephens): should pass in factory, not 'this' here.
    const provider = this.newProvider(type, this, undefined, id, key.toString());
    if (this._memoryMap[key.toString()] !== undefined) {
      return null;
    }
    this._memoryMap[key.toString()] = provider;
    return provider;
  }

  async connect(id: string, type: Type, key: string) : Promise<PouchDbStorageProvider> {
    const imKey = new InMemoryKey(key);

    // Are we connecting to ourselves?
    if (imKey.arcId !== this.arcId.toString()) {
      if (__storageCache[imKey.arcId] == undefined) {
        return null;
      }
      return __storageCache[imKey.arcId].connect(id, type, key);
    }
    if (this._memoryMap[key] == undefined) {
      return null;
    }
    // TODO assert types match?
    return this._memoryMap[key];
  }

  baseStorageKey(type: Type) : string {
    const key = new InMemoryKey('in-memory');
    key.arcId = this.arcId.toString();
    key.location = 'in-memory-' + type.toString();
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

  parseStringAsKey(s: string) : InMemoryKey {
    return new InMemoryKey(s);
  }

  newProvider(type, storageEngine, name, id, key) {
    if (type.isCollection) {
      return new PouchDbCollection(type, storageEngine, name, id, key);
    }
    if (type.isBigCollection) {
      return new PouchDbBigCollection(type, storageEngine, name, id, key);
    }
    return new PouchDbVariable(type, storageEngine, name, id, key);
  }
}
