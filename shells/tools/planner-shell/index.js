/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlannerShellInterface} from './planner-shell.js';

/**
 * Simple nodejs launcher for Planner Shell.
 */

const debug = false; // Set to true to store strategizer `generations`

let storage =  process.env['ARCS_STORAGE'];
if (!storage) {
  storage = PlannerShellInterface.DEFAULT_STORAGE;
  console.log(`No ARCS_STORAGE environment variable, using default:\n\t[${storage}]`);
}

let userId =  process.env['ARCS_USER_ID'] || 'planner';
if (!userId) {
  userId = PlannerShellInterface.DEFAULT_USER_ID;
  console.log(`No ARCS_USER_ID environment variable, using default:\n\t[${userId}]`);
}

const plannerStorage = process.env['ARCS_PLANNER_STORAGE'];

PlannerShellInterface.start('../../', storage, userId, {plannerStorage, debug});
