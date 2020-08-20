/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import WebSocket from 'ws';
import fs from 'fs';

/**
 * Hot Reload Server is opening a WebSocket connection for Arcs Explorer to support hot code reload feature.
 * This connection allows the two to exchange information about the files that need to be watched and if there
 * are any changes to those files. This class receive information about the files that needs to be watched
 * from Arcs Explorer and watches them. Given any changes happen to any of those files it notifies Arcs Explorer
 * such that any particles corresponding to those files can be reloaded.
 */
export class HotReloadServer {
  private server: WebSocket.Server | null;
  private port: number;
  private watchers;
  private filesToWatch;
  private connected: boolean;
  private chokidar;

  constructor(port: number) {
    this.server = null;
    this.port = port;
    this.watchers = [];
    this.filesToWatch = [];
    this.connected = false;
  }

  async init() {
    // This will throw if chokidar hasn't been installed, but in that case we shouldn't get here
    // if this is being launched with sigh.
    // @ts-ignore TS1323 dynamic import
    const chokidarModule = await import('chokidar');
    this.chokidar = chokidarModule.default;
  }

  start() {
    if (this.server === null) {
      this.server = new WebSocket.Server({port: this.port});
    }
    this.server.on('connection', ws => {
      console.log('Hot Reload Server Connected!');

      ws.on('message', msg => {
        this.watchers.forEach(watcher => watcher.close());
        this.watchers = [];
        const watchedFiles = this.filesToWatch;
        this.filesToWatch = [];

        const files = JSON.parse(msg.toString());
        for (const file of files) {
          let local: string = file.replace(/^https:\/\/\$particles\//, './particles/');
          local = local.replace(/^https:\/\/\$arcs\//, './');

          if (!fs.existsSync(local)) continue;
          if (!watchedFiles.includes(file)) {
            ws.send(JSON.stringify({operation: 'watch', path: file}));
            console.log(`Watching: ${local}`);
          }
          this.filesToWatch.push(file);

          let watcher;
          if (local.endsWith('.wasm')) {
            watcher = this.chokidar.watch(local, {
              awaitWriteFinish: true,
              atomic: true
            });
          } else {
            watcher = this.chokidar.watch(local);
          }

          watcher.on('change', async path => {
            console.log(`Detected change: ${path}`);
            ws.send(JSON.stringify({operation: 'reload', path: file}));
          });
          watcher.on('raw', (event, path)=> {
            if (event === 'rename') {
              watcher.unwatch(path);
              watcher.add(path);
            }
          });
          this.watchers.push(watcher);
        }

        if (!this.connected) {
          this.connected = true;
          this.filesToWatch.forEach(file => {
            ws.send(JSON.stringify({operation: 'reload', path: file}));
          });
        }
      });

      ws.on('close', () => {
        this.watchers.forEach(watcher => watcher.close());
        this.watchers = [];
        this.server = null;
        this.filesToWatch = [];
        this.connected = false;
        console.log('Hot Reload Server Disconnected!');
      });

      ws.on('error', e => {
        console.log('Oops, something went wrong: ', e);
      });
    });
  }
}
