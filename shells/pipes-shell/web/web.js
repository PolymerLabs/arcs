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
import '../../lib/loglevel-web.js';
import {paths} from './paths.js';
import {manifest} from './config.js';

// optional
import '../../lib/pouchdb-support.js';
import '../../lib/firebase-support.js';
//import '../../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

import {Utils} from '../../lib/utils.js';
import {DeviceApiFactory} from '../device.js';
import {DevtoolsSupport} from '../../lib/devtools-support.js';

// usage:
//
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
// ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
//
// ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
//
// results returned via `DeviceClient.foundSuggestions(json)` (if it exists)

// can be used for testing:
//
// window.DeviceClient = {
//   shellReady() {
//     console.warn('context is ready!');
//   },
//   foundSuggestions(json) {
//   }
// };
  window.onclick = () => {
    if (window.ShellApi) {
      window.ShellApi.receiveEntity();
    }
  };
//

const storage = `pouchdb://local/arcs/`;
const version = `version: mar-14`;

console.log(version);

(async () => {
  // if remote DevTools are requested, wait for connect
  await DevtoolsSupport();
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // configure ShellApi (window.DeviceClient is bound in by outer process, otherwise undefined)
  window.ShellApi = await DeviceApiFactory(storage, manifest, window.DeviceClient);
})();

