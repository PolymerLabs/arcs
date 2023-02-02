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
import {ArcInfo} from '../runtime/arc-info.js';
import {Arc} from '../runtime/arc.js';
import {Recipe} from '../runtime/recipe/lib-recipe.js';
import {Relevance} from '../runtime/relevance.js';
import {Runtime} from '../runtime/runtime.js';

export class Speculator {
  private speculativeArcs: ArcInfo[] = [];

  constructor(public readonly runtime: Runtime) {}

  async speculate(arcInfo: ArcInfo, plan: Recipe, hash: string, shouldSpeculate: boolean = true): Promise<{speculativeArc: Arc, relevance: Relevance}|null> {
    assert(plan.isResolved(), `Cannot speculate on an unresolved plan: ${plan.toString({showUnresolved: true})}`);
    const speculativeArcInfo = await this.runtime.allocator.cloneArc(arcInfo.id, {isSpeculative: true});
    this.speculativeArcs.push(speculativeArcInfo);
    const relevance = Relevance.create(arcInfo, plan);
    plan = await this.runtime.allocator.assignStorageKeys(speculativeArcInfo.id, plan);

    const {particles, handles} = await speculativeArcInfo.instantiate(plan);
    const speculativeArc = this.runtime.host.getArcById(speculativeArcInfo.id);
    await speculativeArc.instantiate(shouldSpeculate ? particles : [], handles);

    await this.awaitCompletion(relevance, speculativeArc);

    if (shouldSpeculate && !relevance.isRelevant(plan)) {
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
      this.runtime.allocator.stopArc(speculativeArc.id);
      this.speculativeArcs.splice(this.speculativeArcs.indexOf(speculativeArc.arcInfo, 1));
      return relevance;
    }
  }

  dispose(): void {
    for (const arc of this.speculativeArcs) {
      this.runtime.allocator.stopArc(arc.id);
    }
  }
}
