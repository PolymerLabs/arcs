/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

if (!MessageChannel) {

  class MessagePort {
    constructor(channel, id, other) {
      this._channel = channel;
      this._id = id;
      this._other = other;
      this._onmessage = undefined;
    }

    postMessage(message) {
      this._channel._post(this._other, message);
    }

    set onmessage(f) {
      this._onmessage = f;
    }
  }

  class MessageEvent {
    constructor(message) {
      this.data = message;
    }
  }

  class MessageChannel {
    constructor() {
      this.port1 = new MessagePort(this, 0, 1);
      this.port2 = new MessagePort(this, 1, 0);
      this._ports = [port1, port2];
    }

    _post(id, message) {
      message = JSON.parse(JSON.stringify(message));
      Promise.resolve().then(() => {
        if (this._ports[id]._onmessage) {
          this._ports[id]._onmessage(new MessageEvent(message));
        }
      });
    }
  }
}

module.exports = MessageChannel;