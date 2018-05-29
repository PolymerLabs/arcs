/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {DevtoolsChannel} from '../../platform/devtools-channel-web.js';
import {DevtoolsChannelStub} from './testing/devtools-channel-stub.js';

let instance = null;

export function getDevtoolsChannel({useStub} = {}) {
  if (!instance) {
    instance = useStub ? new DevtoolsChannelStub() : new DevtoolsChannel();
  }
  return instance;
}
