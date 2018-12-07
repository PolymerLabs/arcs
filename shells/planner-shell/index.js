// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// platform specific code assets
import '../env/node/arcs.js';

import {ShellPlanningInterface} from './interface.js';

/**
 * Simple nodejs launcher for Shell Planning.
 */

const debug = false; // Set to true to store strategizer `generations`

let storage =  process.env['ARCS_STORAGE'];
if (!storage) {
  storage = ShellPlanningInterface.DEFAULT_STORAGE;
  console.log(`No ARCS_STORAGE environment variable, using default:\n\t[${storage}]`);
}

let userId =  process.env['ARCS_USER_ID'];
if (!userId) {
  userId = ShellPlanningInterface.DEFAULT_USER_ID;
  console.log(`No ARCS_USER_ID environment variable, using default:\n\t[${userId}]`);
}

ShellPlanningInterface.start('../../', storage, userId, debug);
