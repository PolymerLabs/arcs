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

let assert = require('assert');
var tracing = require('../tracelib/trace.js');
const scheduler = require('./scheduler.js');

class Speculator {

  speculate(arc, plan) {
    var callTrace = tracing.start({cat: "speculator", name: "Speculator::speculate"});
    var newArc = arc.clone();
    plan.instantiate(newArc);
    callTrace.end();
    return scheduler.idle.then(() => newArc.relevance);

  }
}

module.exports = Speculator;
