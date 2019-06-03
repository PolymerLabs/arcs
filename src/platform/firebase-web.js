/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// `window.firebase` may contain configuration and other non-active ingredients, but
// `window.firebase.firebase` only has a value if the (optional) firebase library is linked in.
const firebase = window.firebase ? window.firebase.firebase : null;
export {firebase};
