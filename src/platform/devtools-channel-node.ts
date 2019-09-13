/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {AbstractDevtoolsChannel} from '../devtools-connector/abstract-devtools-channel.js';
import {DevtoolsBroker} from '../../devtools/shared/devtools-broker.js';
import WebSocket from 'ws';

export class DevtoolsChannel extends AbstractDevtoolsChannel {
  server: WebSocket.Server;
  socket: WebSocket;
  constructor() {
    super();
    this.server = new WebSocket.Server({port: 8787});
    this.server.on('connection', (ws: WebSocket) => {
      this.socket = ws;
      this.socket.on('message', (msg: string) => {
        if (msg === 'init') {
          DevtoolsBroker.markConnected();
        } else {
          void this._handleMessage(JSON.parse(msg));
        }
      });
    });
  }

  _flush(messages) {
    if (this.socket) {
      this.socket.send(JSON.stringify(messages));
    }
  }
}
