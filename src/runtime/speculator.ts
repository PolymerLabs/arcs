/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Arc} from './arc.js';
import {PlanningResult} from './plan/planning-result.js';
import {Recipe} from './recipe/recipe.js';
import {Relevance} from './relevance.js';
import {Suggestion} from './plan/suggestion.js';

export class Speculator {
  private suggestionByHash: {} = {};
  private speculativeArcs: Arc[] = [];
  
  constructor(planningResult?: PlanningResult) {
    if (planningResult) {
      for (const suggestion of planningResult.suggestions) {
        this.suggestionByHash[suggestion.hash] = suggestion;
      }
    }
  }

  async speculate(arc: Arc, plan: Recipe, hash: string): Promise<Suggestion|null> {
    assert(plan.isResolved(), `Cannot speculate on an unresolved plan: ${plan.toString({showUnresolved: true})}`);

    let suggestion = this.suggestionByHash[hash];
    if (suggestion) {
      const arcVersionByStoreId = arc.getVersionByStore({includeArc: true, includeContext: true});      
      if (plan.handles.every(handle => arcVersionByStoreId[handle.id] === suggestion.versionByStore[handle.id])) {
        return suggestion;
      }
    }
    const speculativeArc = await arc.cloneForSpeculativeExecution();
    this.speculativeArcs.push(speculativeArc);
    const relevance = Relevance.create(arc, plan);
    await speculativeArc.instantiate(plan);
    await this.awaitCompletion(relevance, speculativeArc);

    if (!relevance.isRelevant(plan)) {
      return null;
    }

    speculativeArc.description.relevance = relevance;
    suggestion = Suggestion.create(plan, hash, relevance);
    await suggestion.setDescription(speculativeArc.description);
    this.suggestionByHash[hash] = suggestion;
    return suggestion;
  }

  async awaitCompletion(relevance, speculativeArc) {
    const messageCount = speculativeArc.pec.messageCount;
    relevance.apply(await speculativeArc.pec.idle);

    // We expect two messages here, one requesting the idle status, and one answering it.
    if (speculativeArc.pec.messageCount !== messageCount + 2) {
      return this.awaitCompletion(relevance, speculativeArc);
    } else {
      speculativeArc.stop();
      this.speculativeArcs.splice(this.speculativeArcs.indexOf(speculativeArc, 1));
      return relevance;
    }
  }

  dispose(): void {
    for (const arc of this.speculativeArcs) {
      arc.dispose();
    }
  }
}
