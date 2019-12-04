/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// We use a non-standard way of importing Firebase, which means we don't get type definitions for it. This file just imports the official
// Firebase type definitions and exports them.

import firebase from 'firebase';
export {firebase};
