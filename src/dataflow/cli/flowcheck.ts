/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FlowConfig, FlowChecker} from '../arcs-dataflow.js';

(async () => {
  const configFile = process.argv[1];
  const manifestFile = process.argv[2];
  if (configFile === undefined || manifestFile === undefined) {
    console.log('Usage: flowcheck <config file> <manifest file>');
    return;
  }

  // read the config file
  // read the manifest file
  // build the FlowConfig
  // build the FlowChecker
  // run the checker. Will need a facility for outputing lots more than just the boolean result
})();
