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
import '../../lib/platform/loglevel-node.js';
import {version, paths, storage, test} from './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
//import {DevtoolsSupport} from '../../lib/devtools-support.js';

// dependencies
import {initPipe, initArcs} from '../pipe.js';
import {smokeTest} from '../smoke.js';

console.log(`${version} -- ${storage}`);

const client = global.DeviceClient || {};

(async () => {
  // if remote DevTools are requested, wait for connect
  //await DevtoolsSupport();
  // configure pipes and get a bus
  const bus = await initPipe(client, paths, storage);
  // export bus
  global.ShellApi = bus;
  // post startup shell initializations.
  await initArcs(storage, bus);
  // run smokeTest if requested
  if (test) {
    smokeTest(bus);
  }
})();

// keep alive ... forever
setInterval(() => true, 1000);
