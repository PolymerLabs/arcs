/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

let tracing = require('tracelib');
let assert = require("assert");

var traceFile = process.env.traceFile;
if (traceFile !== undefined) {
  tracing.options.traceFile = traceFile;
  tracing.enable();
}

var currentTrace = undefined;

beforeEach(function() {
  currentTrace = tracing.start({cat: "test", name: this.currentTest.title});
});

afterEach(function() {
  assert(currentTrace !== undefined);
  currentTrace.end({});
  currentTrace = undefined;
});

after(function() {
  tracing.dump();
});
