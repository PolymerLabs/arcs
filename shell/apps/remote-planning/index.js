// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {ShellPlanningInterface} from './interface.js';

/**
 * Simple nodejs launcher for Shell Planning.
 */

let userId =  process.env['ARCS_USER_ID'];
if (!userId) {
  console.log('No ARCS_USER_ID environment variable, using test user "Cletus"');
  userId = ShellPlanningInterface.USER_ID_CLETUS;
}
ShellPlanningInterface.start('../../../', userId);
