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
    // start with a dummy entry so all live indices > 0
    this.transactionIds = [0];
    this.dispatcher = dispatcher;
    this.client = client;
  }
  receive(msg) {
    const body = this.parse(msg);
    const tid = this.assignTransactionId();
    log(`[${tid}] :: received [${JSON.stringify(body, null, '  ')}]`);
    this.mapAsyncValue(tid, async () => this.dispatcher.dispatch(body, tid, this));
    return tid;
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
  assignTransactionId() {
    // the `id` we return is an index into transactionIds which are promises
    let resolve;
    const promise = new Promise(resolve_ => resolve = resolve_);
    promise.resolve = resolve;
    return this.transactionIds.push(promise) - 1;
  }
  async mapAsyncValue(id, asyncFunction) {
    // when `asyncFunction` completes, it's return value is mapped against id
    this.transactionIds[id].resolve(await asyncFunction());
  }
  async recoverTransactionId(forValue) {
    // return tid whose async value matches forValue
    for (let tid=1, promise; (promise=this.transactionIds[tid]); tid++) {
      const value = await promise;
      if (value === forValue) {
        return tid;
      }
    }
  }
  async getAsyncValue(transactionId) {
    return await this.transactionIds[transactionId];
  }
};
