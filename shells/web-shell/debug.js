/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const params = (new URL(document.location)).searchParams;
if (params.has('log')) {
  let logLevel = params.get('log');
  logLevel = logLevel === '' ? 2 : (Number(logLevel) || 0);
  window.logLevel = logLevel;
  console.log(`setting logLevel = ${window.logLevel}`);
}
import {Xen} from '../lib/components/xen.js';
Xen.Debug.level = window.logLevel;
