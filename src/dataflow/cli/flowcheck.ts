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
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';

const fs = require('fs');

// TODO make this a function and test it; it's big enough now

void (async () => {

  const configFile = process.argv[1];
  const manifestFile = process.argv[2];
  if (configFile === undefined || manifestFile === undefined) {
    console.error('Usage: flowcheck <config file> <manifest file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(configFile)) {
    console.error('Configuration file ' + configFile + ' not found.');
    process.exit(1);
  }
  
  let manifest : Manifest;
  let config : FlowConfig;
  
  try {
    config = new FlowConfig(fs.readFileSync(configFile, 'utf8'));
    manifest = await Manifest.load(manifestFile, new Loader());
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  const flowchecker = new FlowChecker(config);
  manifest.allRecipes.forEach(recipe => {
    console.log('Checking recipe ' + recipe.name);
    const res = flowchecker.flowcheck(recipe);
    if (!res.result) {
      console.error("Data-flow check failed. Reason: " + res.reason);
      process.exit(1);
    } else {
      console.log("Data-flow check passed");
    }
  });
}) ();
