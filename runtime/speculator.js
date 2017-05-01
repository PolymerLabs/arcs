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
var tracing = require('tracelib');
const scheduler = require('./scheduler.js');

class Speculator {

  speculate(arc, plan) {
    var callTrace = tracing.start({cat: "speculator", name: "Speculator::speculate"});
    var newArc = arc.clone();
    plan.instantiate(newArc);
    callTrace.end();
    let relevance = new Map();
    async function awaitCompletion() {
      await scheduler.idle;
      var messageCount = newArc.pec.messageCount;
      let newRelevance = await newArc.pec.idle;

      for (let key in newRelevance) {
        if (relevance.has(key))
          relevance.set(key, relevance.get(key).concat(newRelevance[key]));
        else
          relevance.set(key, newRelevance[key]);
      }
      
      if (newArc.pec.messageCount !== messageCount + 1)
        return awaitCompletion();
      else {
        return arc.relevanceFor(relevance);
      }
    }

    return awaitCompletion();

  }
}

module.exports = Speculator;
