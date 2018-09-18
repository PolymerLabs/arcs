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
import {AppBase} from "./app";

/**
 * An app server that additionally configures a pouchdb.
 */
class PouchDbApp extends AppBase {
  // ref to Express instance
  express: express.Application;
  runtime: Runtime;

  constructor() {
    super();
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
    const inMemPouchDb = PouchDB.plugin(PouchDbAdapterMemory).defaults({ adapter: 'memory' });

    // TODO: add /personalcloud mount
    this.express.use('/', PouchDbServer(inMemPouchDb, { mode: 'fullCouchDB', inMemoryConfig: true }));
  }
}

export const app = new PouchDbApp().express;
