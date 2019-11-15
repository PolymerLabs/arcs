/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from '../runtime/hot.js';
import {logFactory} from './log-web.js';

const getGlobal = () => {
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
};

const getLogLevel = () => {
  // acquire global scope
  const g = getGlobal();
  // use specified logLevel otherwise 0
  return ('logLevel' in g) ? g['logLevel'] : 0;
};

// if reporting at all, report log level
if (getLogLevel() > 0) {
  console.log(`log-factory: log level is [${getLogLevel()}]`);
}

const stubFactory = () => () => {};

export const logsFactory = (preamble: string, color: string = ''): Dictionary<Function> => {
  const level = getLogLevel();
  const logs = {};
  ['log', 'warn', 'error', 'group', 'groupCollapsed', 'groupEnd'].
    forEach(log => logs[log] = (level > 0 ? logFactory(preamble, color, log) : stubFactory));
  return logs;
};
