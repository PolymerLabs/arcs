/*
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// paths, logging, etc.
import {paths} from './config.js';

// optional
import '../../lib/pouchdb-support.js';
import '../../lib/firebase-support.js';
//import '../../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

import {Utils} from '../../lib/utils.js';
import {DeviceApiFactory} from '../device.js';
import {devtools} from './devtools.js';

// usage:
//
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
// ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
//
// ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
//
// results returned via `DeviceClient.foundSuggestions(json)` (if it exists)

const storage = `pouchdb://local/arcs/`;
const version = `version: mar-06`;

console.log(version);

(async () => {
  // if remote DevTools are requested, wait for connect
  await devtools();
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // configure ShellApi (window.DeviceClient is bound in by outer process, otherwise undefined)
  window.ShellApi = await DeviceApiFactory(storage, window.DeviceClient);
  // for testing
  window.onclick = () => {
    window.ShellApi.receiveEntity();
  };
})();

