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

export type DevtoolsListener = (msg: DevtoolsMessage) => void;
export type DevtoolsMessage = {
  arcId?: string,
  requestId?: string,
  messageType: string,
  // tslint:disable-next-line: no-any
  messageBody: any,
  meta?: {
    arcId: string,
  }
};

export class AbstractDevtoolsChannel {
  debouncedMessages: DevtoolsMessage[] = [];
  messageListeners: Map<string, DevtoolsListener[]> = new Map();
  timer = null;
  
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

  _handleMessage(msg: DevtoolsMessage) {
    const listeners = this.messageListeners.get(`${msg.arcId}/${msg.messageType}`);
    if (!listeners) {
      console.warn(`No one is listening to ${msg.messageType} message`);
    } else {
      for (const listener of listeners) {
        listener(msg);
      }
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

  static instantiateListener(listenerClass: ArcDebugListenerDerived, 
                             arc: Arc,
                             channel: ArcDevtoolsChannel): ArcDebugListener {
    return new listenerClass(arc, channel);
  }
}

export abstract class ArcDebugListener {
  constructor(_arc: Arc, _channel: ArcDevtoolsChannel) {}
}
type ArcDebugListenerClass = typeof ArcDebugListener;
export interface ArcDebugListenerDerived extends ArcDebugListenerClass {}
