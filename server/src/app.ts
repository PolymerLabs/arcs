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
import { Runtime } from 'arcs';

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
   * Endpoints that end up mapped under /arcs are defined here.
   */
  private addArcsRoutes(): void {
    const router = express.Router();

    router.get('/manifest', async (req, res, next) => {
      const content = `
    schema Text
      Text value

    particle Hello in 'hello.js'
      out Text text

    recipe
      create as handleA
      Hello
        text -> handleA`;

      try {
        const manifest = await Runtime.parseManifest(content, {});
        res.json({ id: manifest.id, text: manifest.toString() });
      } catch (err) {
        next(err);
      }
    });
    // mounts router relative paths on /arcs
    this.express.use('/arcs', router);
  }
}

