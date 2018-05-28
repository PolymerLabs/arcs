/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Tracing} from '../tracelib/trace.js';
import {Relevance} from './relevance.js';

export class Speculator {
  constructor() {
    this._relevanceByHash = new Map();
  }

  async speculate(arc, plan, hash) {
    if (this._relevanceByHash.has(hash)) {
      let relevance = this._relevanceByHash.get(hash);
      if (arc.isSameState(relevance.arcState)) {
        return relevance;
      }
    }

    let trace = Tracing.start({cat: 'speculator', name: 'Speculator::speculate'});
    let newArc = await arc.cloneForSpeculativeExecution();
    let relevance = new Relevance(arc.getStoresState());
    let relevanceByHash = this._relevanceByHash;
    async function awaitCompletion() {
      await newArc.scheduler.idle;
      let messageCount = newArc.pec.messageCount;
      relevance.apply(await newArc.pec.idle);

      if (newArc.pec.messageCount !== messageCount + 1)
        return awaitCompletion();
      else {
        relevance.newArc = newArc;
        relevanceByHash.set(hash, relevance);
        return relevance;
      }
    }

    return trace.endWith(newArc.instantiate(plan).then(a => awaitCompletion()));
  }
}
