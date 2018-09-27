// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import express from 'express';
import PouchDB from 'pouchdb';
import PouchDbAdapterMemory from 'pouchdb-adapter-memory';
import PouchDbServer from 'express-pouchdb';
import { Runtime } from 'arcs';
import { ShellPlanningInterface } from 'arcs';
import {AppBase} from "./app";
import {ON_DISK_DB} from "./deployment/utils";

/**
 * An app server that additionally configures a pouchdb.
 * It also starts a remote planning thread (for now).
 */
class PouchDbApp extends AppBase {
  // ref to Express instance
  express: express.Application;
  runtime: Runtime;

  constructor() {
    super();

    // TODO(plindner): extract this into a separate coroutine instead
    // of starting it here.
    ShellPlanningInterface.start('../');
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
    if (process.env[ON_DISK_DB]) {
      const dboptions = {'prefix': '/personalcloud/'} as  PouchDB.Configuration.RemoteDatabaseConfiguration;
      const onDiskPouchDb = PouchDB.defaults(dboptions);
      this.express.use('/', PouchDbServer(onDiskPouchDb, { mode: 'fullCouchDB', inMemoryConfig: true }));
    } else {
      const inMemPouchDb = PouchDB.plugin(PouchDbAdapterMemory).defaults({ adapter: 'memory' });
      this.express.use('/', PouchDbServer(inMemPouchDb, { mode: 'fullCouchDB', inMemoryConfig: true }));
    }
  }
}

export const app = new PouchDbApp().express;
