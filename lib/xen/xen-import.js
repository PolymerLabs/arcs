/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO(sjmiles): find a packer or configuration that allows packed output to be
// a proper ESM module and make this thunk go awway.

import './dist/xen.js';
const {Xen} = window;
export {Xen};

