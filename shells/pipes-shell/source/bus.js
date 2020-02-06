/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/platform/logs-factory.js';
const {log} = logsFactory('BUS', '#d32e1b');

export const Bus = class {
  constructor(dispatcher, client) {
    this.dispatcher = dispatcher;
    this.client = client;
  }
  receive(msg) {
    const body = this.parse(msg);
    this.dispatcher.dispatch(body, this);
  }
  send(msg) {
    const json = typeof msg === 'string' ? msg : JSON.stringify(msg);
    log(`> send(${json})`);
    if (this.client && this.client.receive) {
      this.client.receive(json);
    }
  }
  parse(msg) {
    if (typeof msg === 'string') {
      try {
        return JSON.parse(msg);
      } catch (x) {
        console.error('failed to parse', msg);
        throw (x);
      }
    }
    return msg;
  }
};
