/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// A prefix that ought to be added when reading files bundled with the binary tool.
//
// This constant is overridden in Google internal repo to allow reading files bundled
// with the executable using the Bazel 'data' attribute.

export const runfilesDir = '';
