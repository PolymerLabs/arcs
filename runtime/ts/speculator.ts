/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Tracing} from '../../tracelib/trace.js';
import {Relevance} from './relevance.js';
import {Arc} from '../arc.js';
import {Recipe} from '../recipe/recipe.js';

export class Speculator {
  _relevanceByHash: Map<string, Relevance>;
  
  constructor() {
    this._relevanceByHash = new Map();
  }

  async speculate(arc: Arc, plan: Recipe, hash: string): Promise<Arc> {
    if (this._relevanceByHash.has(hash)) {
      const arcStoreVersionById = arc.getStoresState({includeContext: true});
      const relevance = this._relevanceByHash.get(hash);
      const relevanceStoreVersionById = relevance.arcState;
      if (plan.handles.every(handle => arcStoreVersionById.get(handle.id) === relevanceStoreVersionById.get(handle.id))) {
        return relevance;
      }
    }

    const newArc = await arc.cloneForSpeculativeExecution();
    const relevance = new Relevance(arc.getStoresState({includeContext: true}));
    const relevanceByHash = this._relevanceByHash;

    async function awaitCompletion() {
      const messageCount = newArc.pec.messageCount;
      relevance.apply(await newArc.pec.idle);

      // We expect two messages here, one requesting the idle status, and one answering it.
      if (newArc.pec.messageCount !== messageCount + 2) {
        return awaitCompletion();
      } else {
        relevance.newArc = newArc;
        relevanceByHash.set(hash, relevance);
        return relevance;
      }
    }

    return newArc.instantiate(plan).then(a => awaitCompletion());
  }
}
