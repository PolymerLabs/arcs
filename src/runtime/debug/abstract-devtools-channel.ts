/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Arc} from '../arc.js';

export class AbstractDevtoolsChannel {
  debouncedMessages = [];
  debouncing = false;
  messageListeners = new Map();
  
  constructor() {
  }

  send(message) {
    this.ensureNoCycle(message);
    this.debouncedMessages.push(message);
    if (!this.debouncing) {
      this.debouncing = true;
      setTimeout(() => {
        this._flush(this.debouncedMessages);
        this.debouncedMessages = [];
        this.debouncing = false;
      }, 100);
    }
  }

  listen(arcOrId, messageType, callback) {
    assert(messageType);
    assert(arcOrId);
    const arcId = typeof arcOrId === 'string' ? arcOrId : arcOrId.id.toString();
    const key = `${arcId}/${messageType}`;
    let listeners = this.messageListeners.get(key);
    if (!listeners) this.messageListeners.set(key, listeners = []);
    listeners.push(callback);
  }

  forArc(arc) {
    return new ArcDevtoolsChannel(arc, this);
  }

  _handleMessage(msg) {
    const listeners = this.messageListeners.get(`${msg.arcId}/${msg.messageType}`);
    if (!listeners) {
      console.warn(`No one is listening to ${msg.messageType} message`);
    } else {
      for (const listener of listeners) listener(msg);
    }
  }

  _flush(messages) {
    throw new Error('Not implemented in an abstract class');
  }

  ensureNoCycle(object, objectPath = []) {
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
  private arcId: string;

  constructor(arc: Arc, channel: AbstractDevtoolsChannel) {
    this.channel = channel;
    this.arcId = arc.id.toString();
  }

  send(message) {
    this.channel.send({
      meta: {arcId: this.arcId},
      ...message
    });
  }

  listen(messageType, callback) {
    this.channel.listen(this.arcId, messageType, callback);
  }
}
