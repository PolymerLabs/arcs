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
import {version, nodevice, test, paths, storage, manifest} from './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
//import '../../configuration/whitelisted.js';
import {DevtoolsSupport} from '../../lib/devtools-support.js';

// main dependencies
import {Bus} from '../source/bus.js';
import {busReady} from '../source/pipe.js';
import {dispatcher} from '../source/dispatcher.js';
//import {smokeTest} from '../source/smoke.js';
import {createTestDevice} from '../source/test-device.js';

console.log(`${version} -- ${storage}`);

const deviceTimeout = 1000;

if (test) {
  window.DeviceClient = createTestDevice(paths, storage);
}

(async () => {
  // if remote DevTools are requested, wait for connect
  await DevtoolsSupport();
  // acquire DeviceClient
  const client = nodevice ? {} : await DeviceSupport();
  // create a bus
  const bus = new Bus(dispatcher, client);
  // configure smokeTest if requested
  if (test) {
    window.DeviceClient.init(bus);
  }
  // export bus
  window.ShellApi = bus;
  busReady(bus, {manifest});
})();

const DeviceSupport = async () => {
  const delay = 100;
  return new Promise(resolve => {
    let waits = Math.round(deviceTimeout / delay);
    const wait = () => {
      if (window.DeviceClient) {
        console.log(window.DeviceClient);
        resolve(window.DeviceClient);
      } else {
        if (waits-- === 0) {
          resolve({});
        } else {
          setTimeout(wait, delay);
        }
      }
    };
    wait();
  });
};

