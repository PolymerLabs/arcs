/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {MessagePort} from '../../build/runtime/message-channel.js';

class PecPort extends MessagePort {
  constructor(arcId, bus) {
    super();
    this.arcId = arcId;
    this.bus = bus;
  }
  close() {}
  postMessage(msg) {
    msg['id'] = this.arcId.toString();
    this.bus.send({message: 'pec', data: msg});
  }
  set onmessage(callback) {
    this.callback = callback;
  }
}

const pecPorts = {};

export const portFactory = (arcId, bus) => {
  const port = new PecPort(arcId, bus);
  pecPorts[arcId] = port;
  return port;
};

export const handlePecMessage = (msg) => {
  if (!pecPorts[msg.id]) {
    console.error(`Cannot find port for ${msg.id}`);
  }
  pecPorts[msg.id].callback({data: msg.entity});
};
