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
import {Server} from 'http';
import {Consumer} from '../../runtime/hot.js';

const reset = `\x1b[0m`;
export const green = (text: string) => `\x1b[32m${text}${reset}`;
export const red = (text: string) => `\x1b[31m${text}${reset}`;
export const bold = (text: string) => `\x1b[1m${text}${reset}`;

/**
 * Explorer Proxy is opening 2 WebSocket connections: one for the Arcs Runtime
 * and one for Arcs Explorer. It allows exchanging messages between the two, but
 * also produces connection status notifications for Arcs Explorer (waiting,
 * connected, disconnected) - so that this status can be reflected in the UI.
 */
export class ExplorerProxy {
  private device: WebSocket|null = null;
  private explorer: WebSocket|null = null;
  private onceDeviceAppearsResolve: Consumer<WebSocket> = () => {};
  private onceDeviceAppears: Promise<WebSocket>;

  constructor() {
    this.onceDeviceAppears = new Promise(
      resolve => this.onceDeviceAppearsResolve = resolve
    );
  }

  listen(server: Server, explorePort: number) {
    new WebSocket.Server({server}).on('connection', ws => {
      console.log(green('Device connected'));
      if (this.device) {
        console.warn(red('Second device attempted connecting'));
        return;
      }
      this.device = ws;
      this.onceDeviceAppearsResolve(ws);
      ws.on('message', msg => {
        if (this.explorer) this.explorer.send(msg);
      });
      ws.on('close', () => {
        this.device = null;
        this.onceDeviceAppears = new Promise(
          resolve => this.onceDeviceAppearsResolve = resolve
        );
        if (this.explorer) {
          this.explorer.send(JSON.stringify([{messageType: 'connection-status-disconnected'}]));
        }
        console.log(red('Device disconnected'));
      });
      ws.on('error', e => {
        this.device = null;
        this.onceDeviceAppears = new Promise(
          resolve => this.onceDeviceAppearsResolve = resolve
        );
        if (this.explorer) this.explorer.send('disconnected');
        console.log(red(`Device error`), e);
      });
    });
    new WebSocket.Server({port: explorePort}).on('connection', ws => {
      console.log(green('Explorer connected'));
      if (this.explorer) {
        ws.send(JSON.stringify([{
          messageType: 'connection-status-broken',
          messageBody: 'Another Arcs Explorer is already connected to this Dev Server.',
        }]));
        console.warn(red('Second explorer attempted connecting'));
        return;
      }
      this.explorer = ws;
      if (!this.device) {
        this.explorer.send(JSON.stringify([{messageType: 'connection-status-waiting'}]));
        void this.onceDeviceAppears.then(() => {
          if (this.explorer) {
            this.explorer.send(JSON.stringify([{messageType: 'connection-status-connected'}]));
          }
        });
      }
      ws.on('message', msg => {
        if (this.device) {
          this.device.send(msg);
        } else {
          void this.onceDeviceAppears.then(device => device.send(msg));
        }
      });
      ws.on('close', () => {
        this.explorer = null;
        console.log(red('Exporer disconnected'));
      });
      ws.on('error', e => {
        this.explorer = null;
        console.log(red(`Exporer error`), e);
      });
    });
  }

  get deviceConnected() {
    return this.device != null;
  }

  get explorerConnected() {
    return this.explorer != null;
  }
}
