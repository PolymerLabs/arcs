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
import {Arc} from '../runtime/arc.js';
import {Description} from '../runtime/description.js';
import {PlanningResult} from './plan/planning-result.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {Relevance} from '../runtime/relevance.js';
import {Suggestion} from './plan/suggestion.js';
import {DevtoolsChannel} from '../platform/devtools-channel-web.js';
import {DevtoolsConnection} from '../runtime/debug/devtools-connection.js';

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

    const description = await Description.create(speculativeArc, relevance);
    suggestion = Suggestion.create(plan, hash, relevance);
    suggestion.setDescription(
        description,
        arc.modality,
        arc.pec.slotComposer ? arc.pec.slotComposer.modalityHandler.descriptionFormatter : undefined);
    this.suggestionByHash[hash] = suggestion;

    // TODO: Find a better way to associate arcs with descriptions.
    //       Ideally, a way that works also for non-speculative arcs.
    if (DevtoolsConnection.isConnected) {
      DevtoolsConnection.get().forArc(speculativeArc).send({
        messageType: 'arc-description',
        messageBody: suggestion.descriptionText
      });
    }
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
