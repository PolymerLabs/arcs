/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let logLevel = 0;
const params = (new URL(document.location)).searchParams;
if (params.has('log')) {
  const log = params.get('log');
  logLevel = log === '' ? 2 : (Number(log) || 0);
  console.log(`setting logLevel = ${logLevel}`);
}

import {Xen} from '../../lib/xen.js';
Xen.Debug.level = logLevel;

window.logLevel = logLevel;

export const paths = {
  root: '.',
  map: {
    'https://$build/': `../../lib/build/`,
    'https://$particles/': `../../../particles/`
  }
};
