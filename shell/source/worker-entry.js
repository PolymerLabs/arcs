// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {InnerPEC} from '../../runtime/inner-PEC.js';
import {BrowserLoader} from './browser-loader.js';

const log = console.log.bind(console, `%cworker-entry`, `background: #12005e; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);

self.onmessage = function(e) {
  self.onmessage = null;
  let {id, base} = e.data;
  //log('starting worker', id);
  new InnerPEC(e.ports[0], id, new BrowserLoader(base));
};
