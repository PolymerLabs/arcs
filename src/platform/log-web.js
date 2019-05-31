/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const _factory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color || 'gray'}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);

// when punting, use full logging
let logLevel = 2;
// TODO(sjmiles): worker.js uses log-web, but has no Window; we need to plumb the
// global configuration into the worker.
// there should always be `window`, we are log-web; if not, use punt value above
if (typeof window !== 'undefined') {
  // use specified logLevel otherwise 0
  logLevel = ('logLevel' in window) ? window.logLevel : 0;
  console.log(`log-web: binding logFactory to level [${logLevel}]`);
}

const factory = logLevel > 0 ? _factory : () => () => {};
export const logFactory = (...args) => factory(...args);
