/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {DevtoolsMessage, DevtoolsListener} from '../abstract-devtools-channel';
import {Arc} from '../../runtime/arc';

/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class DevtoolsChannelStub {
  _messages: DevtoolsMessage[];

  constructor() {
    this._messages = [];
  }

  get messages() {
    return this._messages;
  }

  send(message: DevtoolsMessage) {
    this._messages.push(JSON.parse(JSON.stringify(message)));
  }

  listen(arcOrId: Arc | string, messageType: string, listener: DevtoolsListener) {
    // No-op.
  }

  clear() {
    this._messages.length = 0;
  }

  forArc(arc: Arc) {
    return this;
  }
}
