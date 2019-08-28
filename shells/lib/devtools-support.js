/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {DevtoolsConnection} from '../../build/devtools-connector/devtools-connection.js';

export const DevtoolsSupport = async () => {
  const params = (new URL(document.location)).searchParams;
  if (params.has('remote-explore-key') || params.has('explore-proxy')) {
    // Wait for the remote Arcs Explorer to connect before starting the Shell.
    DevtoolsConnection.ensure();
    await DevtoolsConnection.onceConnected;
  }
};
