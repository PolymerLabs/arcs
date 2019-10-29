/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// configure
import '../../lib/platform/loglevel-web.js';
import {manifest, version, paths, storage, test} from './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
//import '../../configuration/whitelisted.js';
import {DevtoolsSupport} from '../../lib/devtools-support.js';

// main dependencies
import {initPipe, initArcs} from '../source/pipe.js';
import {smokeTest} from '../source/smoke.js';

console.log(`${version} -- ${storage}`);

const client = window.DeviceClient || {};

(async () => {
  // if remote DevTools are requested, wait for connect
  await DevtoolsSupport();
  // configure pipes and get a bus
  const bus = await initPipe(client, paths, storage, manifest);
  // export bus
  window.ShellApi = bus;
  // post startup shell initializations.
  await initArcs(storage, bus, manifest);
  // run smokeTest if requested
  if (test) {
    smokeTest(bus);
    // world's dumbest ui
    window.onclick = () => {
      bus.receive({message: 'ingest', entity: {type: 'notion', jsonData: 'Dogs are awesome'}});
    };
  }
})();
