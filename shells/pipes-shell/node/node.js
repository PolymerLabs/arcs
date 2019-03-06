/*
* @license
* Copyright (c) 2019 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

import './config.js';

// optional
//import '../../lib/pouchdb-support.js';
//import '../../lib/firebase-support.js';
//import '../../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

import {Utils} from '../../lib/utils.js';
import {DeviceApiFactory} from '../device.js';

// usage:
//
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
// ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
//
// ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
//
// results returned via `DeviceClient.foundSuggestions(json)` (if it exists)

(async () => {
  console.log(`version: feb-27.0`);
  global.ShellApi = await DeviceApiFactory(`volatile://`, global.DeviceClient);
  // configure arcs environment
  Utils.init(global.envPaths.root, global.envPaths.map);
})();

// test it

// setTimeout(() => {
//   global.ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`);
//   global.ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`);
//   global.ShellApi.receiveEntity(`{"type": "com.music.spotify"}`);
// }, 500);
