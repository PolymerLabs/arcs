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

class Speculator {

  speculate(arc, plan) {
    arc.checkpoint();
    arc.resetRelevance();
    plan.suggestions.forEach(suggestion => suggestion.instantiate(arc));
    while (arc.tick());
    var relevance = arc.relevance;
    arc.revert();
    return relevance;
  }

}

module.exports = Speculator;