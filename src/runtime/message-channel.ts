/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class MessagePort {
  readonly _channel: MessageChannel;
  readonly _id: number;
  readonly _other: number;
  _onmessage: (e: MessageEvent) => void | undefined;

  constructor(channel, id, other) {
    this._channel = channel;
    this._id = id;
    this._other = other;
    this._onmessage = undefined;
  }

  // TODO appears to be {messageType, messageBody}
  async postMessage(message) {
    await this._channel._post(this._other, message);
  }

  set onmessage(f: (e: MessageEvent) => void) {
    this._onmessage = f;
  }

  close() {
    this.postMessage = async () => {};
  }
}

class MessageEvent {
  data: {};
  constructor(message: {}) {
    this.data = message;
  }
}

export class MessageChannel {
  port1: MessagePort;
  port2: MessagePort;
  _ports: MessagePort[];

  constructor() {
    this.port1 = new MessagePort(this, 0, 1);
    this.port2 = new MessagePort(this, 1, 0);
    this._ports = [this.port1, this.port2];
  }

  async _post(id: number, message: {}) {
    message = JSON.parse(JSON.stringify(message));
    if (this._ports[id]._onmessage) {
      try {
        // Yield so that we deliver the message asynchronously.
        await 0;
        await this._ports[id]._onmessage(new MessageEvent(message));
      } catch (e) {
        console.error('Exception in particle code\n', e);
      }
    }
  }
}
