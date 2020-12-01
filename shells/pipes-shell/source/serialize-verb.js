/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/platform/logs-factory.js';

const {log} = logsFactory('SerializeVerb');

// TODO(sjmiles): allow serializing verbs to reduce synchronization
// burden on apps. Not strictly part of runtime api: revisit at some point.

// have separate queues per verb
const work = {};

// only for logging
let index = 0;

export const serializeVerb = async (verb, asyncTask) => {
  // only for logging
  const id = ++index;
  // capture previous work-promise
  const busy = work[verb];
  // construct new work-promise
  let resolve;
  work[verb] = new Promise(_resolve => resolve = _resolve);
  // wait for previous work (yields at await)
  log(`awaiting [${verb}][${id-1}]`);
  await busy;
  // begin new work (yields at await)
  log(`invoking [${verb}][${id}]`);
  await (async () => {
    const result = await asyncTask();
    log(`completed [${verb}][${id}]`);
    resolve(result);
  })();
  // return new work-promise
  return work[verb];
};
