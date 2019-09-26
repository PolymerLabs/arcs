/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import express from 'express';
import http from 'http';
import minimist from 'minimist';
import morgan from 'morgan';

import {status} from './status-handler';
import {ExplorerProxy} from './explorer-proxy';
import {HotReloadServer} from './hot-reload-server';

// ALDS - Arcs Local Development Server.
//
// It consists of 2 components:
// * Web Server serving static files from the root directory.
// * WebSocket proxy for exchangin messages between Arcs Runtime and Arcs Explorer.
// There are many plans for extending this list for various development features.


const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const END = '\x1b[0m';
const CMD = `${BOLD}${YELLOW}`;

async function launch() {
  const options = minimist(process.argv.slice(2), {
    boolean: ['verbose'],
    default: {port: 8786, explorePort: 8787, hotReloadPort: 8888, verbose: false}
  });

  const port = Number(options['port']);
  const explorePort = Number(options['explorePort']);
  const hotReloadPort = Number(options['hotReloadPort']);

  const proxy = new ExplorerProxy();
  const hotReloadServer = new HotReloadServer(hotReloadPort);
  await hotReloadServer.init();
  
  const app = express();
  if (options['verbose']) {
    app.use(morgan(':method :url :status - :response-time ms, :res[content-length] bytes'));
  }
  app.use(status(proxy));
  app.use(express.static('.'));

  const server = http.createServer(app);
  server.listen(port);
  proxy.listen(server, explorePort);
  hotReloadServer.start();

  console.log(`${GREEN}${BOLD}ALDS Started.${END}\n\nWeb server port: ${port}\nExplorer port: ${explorePort}\nHotReload port: ${hotReloadPort}`);
  console.log(`\n${GREEN}Next, try visiting:${END}`);
  console.log(`- ${CMD}http://localhost:${port}/shells/web-shell${END}`);
  console.log(`- ${CMD}http://localhost:${port}/shells/dev-shell${END}`);
}

void launch();
