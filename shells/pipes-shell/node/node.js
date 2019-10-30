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
import {version, test, paths, storage, manifest} from './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
//import {DevtoolsSupport} from '../../lib/devtools-support.js';

// main dependencies
import {Bus} from '../source/bus.js';
import {busReady} from '../source/pipe.js';
import {smokeTest} from '../source/smoke.js';
import {dispatcher} from '../source/dispatcher.js';

console.log(`${version} -- ${storage}`);

const client = global.DeviceClient || {};

(async () => {
  // if remote DevTools are requested, wait for connect
  //await DevtoolsSupport();
  // create a bus
  const bus = new Bus(dispatcher, client);
  // export bus
  global.ShellApi = bus;
  busReady(bus);
  // run smokeTest if requested
  if (test) {
    smokeTest(paths, storage, manifest, bus);
  }
})();

// keep alive ... forever
setInterval(() => true, 1000);
