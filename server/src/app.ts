// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import bodyParser from 'body-parser';
import express from 'express';
import logger from 'morgan';
import path from 'path';
import PouchDB from 'pouchdb';
import PouchDbAdapterMemory from 'pouchdb-adapter-memory';
import PouchDbServer from 'express-pouchdb';

/**
 * Centralized class that configures and ExpressJS server.
 * Adds static content, a database and api methods for Arcs.
 */
class App {
  // ref to Express instance
  express: express.Application;

  constructor() {
    this.express = express();
    this.middleware();
    // TODO add webhook endpoints here
    this.addArcsRoutes();
    this.addStaticRoutes();
    this.addPouchRoutes();
  }

  /** Configure Express middleware. */
  private middleware(): void {
    this.express.use(logger('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  /**
   * Adds handlers for static content.  The public directory is
   * checked first.  If not found then the legacy arcs directory is searched.
   */
  private addStaticRoutes(): void {
    this.express.use(express.static('public'));
    this.express.use(express.static('node_modules/arcs'));
  }

  /**
   * Adds support for a local PouchDB database service.  More information about setup is available at
   * https://github.com/pouchdb/pouchdb-server
   */
  private addPouchRoutes(): void {
    const inMemPouchDb = PouchDB.plugin(PouchDbAdapterMemory).defaults({ adapter: 'memory' });

    this.express.use('/', PouchDbServer(inMemPouchDb, { mode: 'fullCouchDB', inMemoryConfig: true }));
  }

  /**
   * Placeholder for creating an API endpoint to Arcs Runtime.
   */
  private addArcsRoutes(): void {
    const router = express.Router();
    // placeholder route handler
    router.get('/arcs', (req, res, next) => {
      res.json({ message: 'Hello World!' });
    });
    this.express.use('/arcs', router);
  }
}

export const app = new App().express;
