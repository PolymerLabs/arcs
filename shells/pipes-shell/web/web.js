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
import {version, test, paths, storage, manifest} from './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
import {DevtoolsSupport} from '../../lib/devtools-support.js';
//import '../../configuration/whitelisted.js';

// main dependencies
import {Bus} from '../source/bus.js';
import {busReady} from '../source/pipe.js';
import {smokeTest} from '../source/smoke.js';
import {dispatcher} from '../source/dispatcher.js';

console.log(`${version} -- ${storage}`);

const client = window.DeviceClient || {};

(async () => {
  // if remote DevTools are requested, wait for connect
  await DevtoolsSupport();
  // create a bus
  const bus = new Bus(dispatcher, client);
  // export bus
  window.ShellApi = bus;
  busReady(bus, {manifest});
  // run smokeTest if requested
  if (test) {
    smokeTest(paths, storage, manifest, bus);
    // world's dumbest ui
    window.onclick = () => {
      bus.receive({message: 'ingest', entity: {type: 'notion', jsonData: 'Dogs are awesome'}});
    };
  }
})();
