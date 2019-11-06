/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import debug from 'debug';
import http from 'http';

import {AppBase} from './app-base';
import {app as masterapp} from './arcs-master-app';
import {app as dbapp} from './pouch-db-app';

const app: AppBase = process.env.ARCS_MASTER ? masterapp : dbapp;

/**
 * Basic code that sets up and configures a Arcs Cloud Instance.
 * Mostly handles designating a default port.
 */
debug('ts-express:server');

const port = normalizePort(process.env.PORT || 8080);
app.express.set('port', port);

const server = http.createServer(app.express);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val: number | string): number | string | boolean {
  const port: number = Number(val);
  if (isNaN(port)) {
    return val;
  } else if (port >= 0) {
    return port;
  } else {
    return false;
  }
}

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
  console.log(`Arcs Server listening on ${bind}`);
  setTimeout(() => {
    app.startBackgroundProcessing();
  });
}
