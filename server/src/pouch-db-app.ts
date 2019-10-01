/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlannerShellInterface} from 'arcs';
import PouchDbServer from 'express-pouchdb';
import PouchDB from 'pouchdb';
import PouchDbAdapterMemory from 'pouchdb-adapter-memory';

import {AppBase} from './app-base';
import {ON_DISK_DB, VM_URL_PREFIX} from './deployment/utils';

/**
 * An app server that additionally configures a pouchdb.
 * It also starts a remote planning thread (for now).
 *
 * Environment variables recognized:
 * - `TARGET_DISK` used to store an on-disk pouch database.
 * - `ARCS_USER_ID` used to specify the user that owns this instance.
 * - `STORAGE_KEY_BASE` default is `pouchdb://localhost:8080/user`
 */
class PouchDbApp extends AppBase {
  private static readonly storageKeyBase: string = process.env['STORAGE_KEY_BASE'] || 'pouchdb://localhost:8080/user/';
  private static readonly userId: string = process.env['ARCS_USER_ID'] || PlannerShellInterface.DEFAULT_USER_ID;

  startBackgroundProcessing(): void {
    try {
      console.log('starting shell planning for ' + PouchDbApp.userId + ' with storage Key ' + PouchDbApp.storageKeyBase);
      PlannerShellInterface.start('../',  PouchDbApp.storageKeyBase, PouchDbApp.userId, process.env['DEBUG'] === 'true');
    } catch (err) {
      console.warn(err);
    }
  }

  protected addRoutes() {
    super.addRoutes();
    this.addPouchRoutes();
  }

  /**
   * Adds support for a local PouchDB database service.  More information about setup is available at
   * https://github.com/pouchdb/pouchdb-server
   */
  private addPouchRoutes(): void {
    // If VM lives at non-root prefix, works but fauxton not fully working yet
    const urlPrefix = process.env[VM_URL_PREFIX] || '/';
    const config = {
      mode: 'fullCouchDB', inMemoryConfig: true,
      'httpd': {
        'enable_cors': true
      },
      'cors': {
        'origins': 'https://skarabrae.org',
        'credentials': true,
        'headers': 'accept, authorization, content-type, origin, referer',
        'methods': 'GET, PUT, POST, HEAD, DELETE'
      }
    };

    if (process.env[ON_DISK_DB]) {
      const dboptions = {prefix: '/personalcloud/'} as PouchDB.Configuration.RemoteDatabaseConfiguration;
      const onDiskPouchDb = PouchDB.defaults(dboptions);
      const pouchDbRouter = PouchDbServer(onDiskPouchDb, config);
      this.express.use(urlPrefix, pouchDbRouter);
    } else {
      const inMemPouchDb = PouchDB.plugin(PouchDbAdapterMemory).defaults({adapter: 'memory'});
      this.express.use('/', PouchDbServer(inMemPouchDb, {mode: 'fullCouchDB', inMemoryConfig: true}));
    }
    console.log('added pouch routes');
  }
}

export const app = new PouchDbApp();
