/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const _factory = (preamble, color, log = 'log') =>
  console[log].bind(
    console,
    `%c${preamble}`,
    `background: ${color || 'gray'}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`
  );

// don't spam the console for workers
if (typeof window !== 'undefined') {
  console.log(`log-web: binding logFactory to level [${window.logLevel}]`);
}

export const logFactory = (...args) => {
  // could be running in worker
  const g = (typeof window !== 'undefined') ? window : global;
  // use specified logLevel otherwise 0
  const logLevel = ('logLevel' in g) ? g['logLevel'] : 0;
  // modulate factory based on logLevel
  const factory = logLevel > 0 ? _factory : () => () => {};
  return factory(...args);
};
