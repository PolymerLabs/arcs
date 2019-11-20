/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Runtime} from 'arcs';
import bodyParser from 'body-parser';
import express from 'express';
import logger from 'morgan';

/**
 * Centralized base class that configures and ExpressJS server.
 * Adds static content, and api methods for Arcs. See pouchdbapp and arcsmasterapp
 * for concrete examples.
 */
export abstract class AppBase {
  // ref to Express instance
  express: express.Application;
  runtime: Runtime;

  constructor() {
    this.express = express();
    this.middleware();
    this.addRoutes();
    // TODO add webhook endpoints here
    this.runtime = new Runtime();
  }

  /**
   * Override this method to configure server specific routes.
   */
  protected addRoutes() {
    this.addArcsRoutes();
    this.addStaticRoutes();
  }

  /** Configure Express middleware. */
  private middleware(): void {
    this.express.use(logger('dev'));
    // This larger setting is required to support PouchDB replication.
    // TODO(lindner): move to a config location and document this.
    this.express.use(bodyParser.json({limit: '5mb'}));
    this.express.use(bodyParser.urlencoded({limit: '5mb', extended: false}));
  }

  /**
   * Override this method to execute code after the server starts listening.
   * Used to run background processes like Shell Planning.
   */
  public startBackgroundProcessing(): void {
    // optional method that starts background processing.
    console.log('Running optional background process');
  }

  /**
   * Adds handlers for static content.  The public directory is
   * checked first.  If not found then the legacy arcs directory is searched.
   */
  private addStaticRoutes(): void {
    // TODO(lindner): disabling because pouchdb needs to access the root level json
    // and fauxton cannot run under a subdirectory.
    // see https://github.com/pouchdb/pouchdb-fauxton/issues/18
    this.express.use(express.static('node_modules/arcs'));
  }

  /**
   * Endpoints that end up mapped under /arcs are defined here.
   */
  private addArcsRoutes(): void {
    const router = express.Router();

    router.get('/manifest', async (req, res, next) => {
      const content = `
    schema Text
      value: Text

    particle Hello in 'hello.js'
      text: writes Text

    recipe
      handleA: create *
      Hello
        text: writes handleA`;

      try {
        const manifest = await Runtime.parseManifest(content, {fileName: 'manifest'});
        res.json({id: manifest.id.toString(), text: manifest.toString()});
      } catch (err) {
        next(err);
      }
    });
    // mounts router relative paths on /arcs
    this.express.use('/arcs', router);
  }
}
