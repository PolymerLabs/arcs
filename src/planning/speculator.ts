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
import {Recipe} from '../runtime/recipe/recipe.js';
import {Relevance} from '../runtime/relevance.js';

export class Speculator {
  private speculativeArcs: Arc[] = [];

  async speculate(arc: Arc, plan: Recipe, hash: string): Promise<{speculativeArc: Arc, relevance: Relevance}|null> {
    assert(plan.isResolved(), `Cannot speculate on an unresolved plan: ${plan.toString({showUnresolved: true})}`);
    const speculativeArc = await arc.cloneForSpeculativeExecution();
    this.speculativeArcs.push(speculativeArc);
    const relevance = Relevance.create(arc, plan);
    await speculativeArc.instantiate(plan);
    await this.awaitCompletion(relevance, speculativeArc);

    if (!relevance.isRelevant(plan)) {
      return null;
    }

    return {speculativeArc, relevance};
  }

  private async awaitCompletion(relevance: Relevance, speculativeArc: Arc): Promise<Relevance> {
    const messageCount = speculativeArc.peh.messageCount;
    relevance.apply(await speculativeArc.peh.idle);

    // We expect two messages here, one requesting the idle status, and one answering it.
    if (speculativeArc.peh.messageCount !== messageCount + 2) {
      return this.awaitCompletion(relevance, speculativeArc);
    } else {
      speculativeArc.dispose();
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
