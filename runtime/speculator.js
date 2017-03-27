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

class Speculator {

  speculate(arc, plan) {
    var callTrace = tracing.start({cat: "speculator", name: "Speculator::speculate"});
    var trace = tracing.flow({cat: "speculator", name: "Speculator::speculate"}).start();
    arc.checkpoint();
    return new Promise((resolve, reject) => {
      var internalTrace = tracing.start({cat: "speculator", name: "Speculator::speculate internal"});
      arc.resetRelevance();
      let views = [].concat(...Array.from(arc.scope._viewsByType.values()));

      var dirtyCount = 0;
      function clean() {
        assert(dirtyCount > 0, "clean called but I'm not dirty");
        dirtyCount--;
        if (dirtyCount == 0) {
          views.forEach(view => {
            view._clean = null;
            view._dirty = null;
          });
          var relevance = arc.relevance;
          arc.revert();
          resolve(relevance);
          trace.end();
        } else {
          trace.step();
        }
      }

      function dirty() {
        dirtyCount++;
        trace.step();
      }

      views.forEach(view => {
        if (view._pendingCallbacks > 0) {
          dirtyCount++;
        }
        view._clean = clean;
        view._dirty = dirty;
      });

      plan.instantiate(arc);
      internalTrace.end();
    });
    callTrace.end();
  }
}

module.exports = Speculator;
