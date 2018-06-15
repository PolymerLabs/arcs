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
import {DevtoolsChannel} from '../../platform/devtools-channel-web.js';
import {DevtoolsChannelStub} from './testing/devtools-channel-stub.js';
import {DevtoolsBroker} from '../../devtools/shared/devtools-broker.js';

let channel = null;
let isConnected = false;
let onceConnectedResolve = null;
let onceConnected = new Promise(resolve => onceConnectedResolve = resolve);

DevtoolsBroker.onceConnected.then(() => {
  DevtoolsConnection.ensure();
  onceConnectedResolve(channel);
  isConnected = true;
});

export class DevtoolsConnection {
  static get isConnected() {
    return isConnected;
  }
  static get onceConnected() {
    return onceConnected;
  }
  static get() {
    return channel;
  }
  static ensure() {
    if (!channel) channel = new DevtoolsChannel();
  }
}

export class DevtoolsForTests {
  static get channel() {
    return channel;
  }
  static ensureStub() {
    assert(!channel);
    channel = new DevtoolsChannelStub();
    onceConnectedResolve(channel);
    isConnected = true;
  }
  static reset() {
    assert(channel);
    isConnected = false;
    onceConnectedResolve = null;
    onceConnected = new Promise(resolve => onceConnectedResolve = resolve);
    channel = null;
  }
}
