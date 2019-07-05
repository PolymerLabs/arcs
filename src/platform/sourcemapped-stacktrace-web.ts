/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// "Convert" old-style module to ES6.
//const smst = require('sourcemapped-stacktrace/sourcemapped-stacktrace.js');
//export const mapStackTrace = smst.mapStackTrace;

// TODO(sjmiles): no 'require' on web, rely on global otherwise-loaded
export const mapStackTrace = window['sourceMappedStackTrace'] && window['sourceMappedStackTrace'].mapStackTrace;

