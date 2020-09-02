/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Arc} from '../runtime/arc.js';
import {AsyncConsumer} from '../utils/lib-utils.js';

export type DevtoolsListener = AsyncConsumer<DevtoolsMessage>;
export type DevtoolsMessage = {
  arcId?: string,
  requestId?: string,
  messageType: string,
  // tslint:disable-next-line: no-any
  messageBody?: any,
  meta?: {
    arcId: string,
  }
};

export class AbstractDevtoolsChannel {
  private debouncedMessages: DevtoolsMessage[] = [];
  private messageListeners: Map<string, DevtoolsListener[]> = new Map();
  private timer = null;

  constructor() {
  }

  send(message: DevtoolsMessage) {
    this.ensureNoCycle(message);
    this.debouncedMessages.push(message);
    // Temporary workaround for WebRTC slicing messages above 2^18 characters.
    // Need to find a proper fix. Is there some config in WebRTC to fix this?
    // If not prefer to slice messages based on their serialized form.
    // Maybe zip them for transport?
    if (this.debouncedMessages.length > 10) {
      this._empty();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this._empty(), 100);
    }
  }

  listen(arcOrId : Arc | string, messageType: string, listener: DevtoolsListener) {
    assert(messageType);
    assert(arcOrId);
    const arcId = typeof arcOrId === 'string' ? arcOrId : arcOrId.id.toString();
    const key = `${arcId}/${messageType}`;
    let listeners = this.messageListeners.get(key);
    if (!listeners) {
      this.messageListeners.set(key, listeners = []);
    }
    listeners.push(listener);
  }

  forArc(arc: Arc): ArcDevtoolsChannel | AbstractDevtoolsChannel {
    return new ArcDevtoolsChannel(arc, this);
  }

  async _handleMessage(msg: DevtoolsMessage) {
    const listeners = this.messageListeners.get(`${msg.arcId}/${msg.messageType}`);
    if (!listeners) {
      console.warn(`No one is listening to ${msg.messageType} message`);
    } else {
      await Promise.all(listeners.map(l => l(msg)));
    }
  }

  _empty() {
    this._flush(this.debouncedMessages);
    this.debouncedMessages = [];
    clearTimeout(this.timer);
    this.timer = null;
  }

  _flush(_messages: DevtoolsMessage[]) {
    throw new Error('Not implemented in an abstract class');
  }

  // tslint:disable-next-line: no-any
  ensureNoCycle(object: any, objectPath: {}[] = []) {
    if (!object || typeof object !== 'object') return;
    assert(objectPath.indexOf(object) === -1, 'Message cannot contain a cycle');

    objectPath.push(object);
    (Array.isArray(object) ? object : Object.values(object)).forEach(
        element => this.ensureNoCycle(element, objectPath));
    objectPath.pop();
  }
}

export class ArcDevtoolsChannel {
  private channel: AbstractDevtoolsChannel;
  private readonly arcId: string;

  constructor(arc: Arc, channel: AbstractDevtoolsChannel) {
    this.channel = channel;
    this.arcId = arc.id.toString();
  }

  send(message: DevtoolsMessage) {
    this.channel.send({
      meta: {arcId: this.arcId},
      ...message
    });
  }

  listen(messageType: string, callback: DevtoolsListener) {
    this.channel.listen(this.arcId, messageType, callback);
  }
}
