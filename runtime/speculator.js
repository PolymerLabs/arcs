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

class Speculator {

  speculate(arc, plan) {
    arc.checkpoint();
    return new Promise((resolve, reject) => {
      arc.resetRelevance();
      let views = [].concat(...Array.from(arc.scope._viewsByType.values()));

      var dirtyCount = 0;
      function clean() {
        assert(dirtyCount > 0);
        dirtyCount--;
        if (dirtyCount == 0) {
          views.forEach(view => {
            view._clean = null;
            view._dirty = null;
          });
          var relevance = arc.relevance;
          arc.revert();
          resolve(relevance);
        }
      }

      function dirty() {
        dirtyCount++;
      }

      views.forEach(view => {
        view._clean = clean;
        view._dirty = dirty;
      });

      plan.instantiate(arc);
    });
  }
}

module.exports = Speculator;
