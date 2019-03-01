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
import './config.js';

// optional
import '../../lib/pouchdb-support.js';
import '../../lib/firebase-support.js';
//import '../../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

import {Utils} from '../../lib/utils.js';
import {DeviceApiFactory} from '../device.js';
import {DevtoolsConnection} from '../../../build/runtime/debug/devtools-connection.js';

// usage:
//
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
// ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
//
// ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
//
// results returned via `DeviceClient.foundSuggestions(json)` (if it exists)

console.log(`version: feb-27.0`);

 // TODO(sjmiles): move into a module?
const devToolsHandshake = async () => {
  const params = (new URL(document.location)).searchParams;
  if (params.has('remote-explore-key')) {
    // Wait for the remote Arcs Explorer to connect before starting the Shell.
    DevtoolsConnection.ensure();
    await DevtoolsConnection.onceConnected;
  }
};

(async () => {
  // if remote DevTools are requested, wait for connect
  await devToolsHandshake();
  // configure arcs environment
  Utils.init(window.envPaths.root, window.envPaths.map);
  // configure ShellApi (window.DeviceClient is bound in by outer process, otherwise undefined)
  window.ShellApi = DeviceApiFactory('pouchdb://local/arcs/', window.DeviceClient);
  // for testing
  window.onclick = () => {
    window.ShellApi.receiveEntity();
  };
})();

