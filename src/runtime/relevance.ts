/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Arc} from './arc.js';
import {Recipe, Particle} from './recipe/lib-recipe.js';

export class Relevance {
  // stores a copy of arc.getVersionByStore
  readonly versionByStore = {};

  // public for testing
  public readonly relevanceMap: Map<Particle, number[]> = new Map();

  private constructor() {}

  static create(arc: Arc, recipe: Recipe): Relevance {
    const relevance = new Relevance();
    const versionByStore = arc.arcInfo.getVersionByStore({includeArc: true, includeContext: true});
    recipe.handles.forEach(handle => {
      if (handle.id && versionByStore[handle.id] !== undefined) {
        relevance.versionByStore[handle.id] = versionByStore[handle.id];
      }
    });
    return relevance;
  }

  apply(relevance: ReadonlyMap<Particle, number[]>): void {
    for (const key of relevance.keys()) {
      if (this.relevanceMap.has(key)) {
        this.relevanceMap.set(
            key, this.relevanceMap.get(key).concat(relevance.get(key)));
      } else {
        this.relevanceMap.set(key, relevance.get(key));
      }
    }
  }

  calcRelevanceScore(): number {
    let relevance = 1;
    let hasNegative = false;
    for (const rList of this.relevanceMap.values()) {
      const particleRelevance = Relevance.particleRelevance(rList);
      if (particleRelevance < 0) {
        hasNegative = true;
      }
      relevance *= Math.abs(particleRelevance);
    }
    return relevance * (hasNegative ? -1 : 1);
  }

  // Returns false, if at least one of the particles relevance lists ends with a negative score.
  isRelevant(plan: Recipe): boolean {
    const hasUi = plan.particles.some(p => p.getSlotConnections().length > 0);
    let rendersUi = false;

    for (const [particle, rList] of this.relevanceMap) {
      if (rList[rList.length - 1] < 0) {
        continue;
      } else if (particle.getSlotConnections().length) {
        rendersUi = true;
        break;
      }
    }

    // If the recipe has UI rendering particles, at least one of the particles must render UI.
    return hasUi === rendersUi;
  }

  static scaleRelevance(relevance: number): number {
    if (relevance == undefined) {
      relevance = 5;
    }
    relevance = Math.max(-1, Math.min(relevance, 10));
    // TODO: might want to make this geometric or something instead;
    return relevance / 5;
  }

  static particleRelevance(relevanceList: number[]): number {
    let relevance = 1;
    let hasNegative = false;
    relevanceList.forEach(r => {
      const scaledRelevance = Relevance.scaleRelevance(r);
      if (scaledRelevance < 0) {
        hasNegative = true;
      }
      relevance *= Math.abs(scaledRelevance);
    });
    return relevance * (hasNegative ? -1 : 1);
  }

  calcParticleRelevance(particle: Particle): number {
    if (this.relevanceMap.has(particle)) {
      return Relevance.particleRelevance(this.relevanceMap.get(particle));
    }
    return -1;
  }
}
