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

import {AbstractDevtoolsChannel} from '../runtime/debug/abstract-devtools-channel.js';

export class DevtoolsChannel extends AbstractDevtoolsChannel {
  constructor() {
    super();
    document.addEventListener('arcs-debug-in', e => this._handleMessage(e.detail));
    this._makeReady(); // TODO: Consider readiness if connecting via extension.
  }

  _flush(messages) {
    document.dispatchEvent(new CustomEvent('arcs-debug-out', {detail: messages}));
  }
}
