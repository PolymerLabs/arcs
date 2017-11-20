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

import assert from '../platform/assert-web.js';
import tracing from '../tracelib/trace.js';
import scheduler from './scheduler.js';
import Relevance from './relevance.js';

class Speculator {

  speculate(arc, plan) {
    var trace = tracing.start({cat: "speculator", name: "Speculator::speculate"});
    var newArc = arc.cloneForSpeculativeExecution();
    newArc.instantiate(plan);
    let relevance = new Relevance();
    async function awaitCompletion() {
      await scheduler.idle;
      var messageCount = newArc.pec.messageCount;
      relevance.apply(await newArc.pec.idle);

      if (newArc.pec.messageCount !== messageCount + 1)
        return awaitCompletion();
      else {
        relevance.newArc = newArc;
        return relevance;
      }
    }

    let result = awaitCompletion();
    trace.end();
    return result;
  }
}

export default Speculator;
