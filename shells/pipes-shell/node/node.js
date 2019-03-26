/*
* @license
* Copyright (c) 2019 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

 // configure
import '../../lib/loglevel-node.js';
import {paths} from './paths.js';
import {manifest} from './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
//import '../../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

import {Utils} from '../../lib/utils.js';
import {DeviceApiFactory} from '../device.js';

// usage:
//
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
// [arcid =] ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
//
// [arcid =] ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
//
// results returned via `DeviceClient.foundSuggestions(arcid, json)` (if it exists)

//const storage = `pouchdb://local/arcs/`;
const storage = `volatile://`;
const version = `version: mar-26`;

console.log(`${version} -- ${storage}`);

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1); //mandatory (as per the Node docs)
});

(async () => {
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // configure ShellApi (DeviceClient is bound in by outer process, otherwise undefined)
  global.ShellApi = await DeviceApiFactory(storage, manifest, global.DeviceClient);
})();

if ('test' in global.params) {
  setTimeout(() => test_on_start(), 1000);
}

const test_on_start = async () => {
  global.ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`);
  let id = global.ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`);
  console.log('request id', id);
  id = global.ShellApi.receiveEntity(`{"type": "com.music.spotify"}`);
  console.log('request id', id);
};
