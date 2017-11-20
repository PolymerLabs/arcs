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

class Relevance {
  constructor() {
    this.relevanceMap = new Map();
  }

  apply(relevance) {
    for (let key of relevance.keys()) {
      if (this.relevanceMap.has(key))
        this.relevanceMap.set(key, this.relevanceMap.get(key).concat(relevance.get(key)));
      else
        this.relevanceMap.set(key, relevance.get(key));
    }
  }

  calcRelevanceScore() {
    let relevance = 1;
    let hasNegative = false;
    for (let rList of this.relevanceMap.values()) {
      let particleRelevance = Relevance.particleRelevance(rList);
      if (particleRelevance < 0) {
        hasNegative = true;
      }
      relevance *= Math.abs(particleRelevance);
    }
    return relevance * (hasNegative ? -1 : 1);
  }

  // Returns false, if at least one of the particles relevance lists ends with a negative score.
  isRelevant(plan) {
    let hasUi = plan.particles.some(p => Object.keys(p.consumedSlotConnections).length > 0);
    let rendersUi = false;
    this.relevanceMap.forEach((rList, particle) => {
      if (rList[rList.length - 1] < 0) {
        return false;
      } else if (Object.keys(particle.consumedSlotConnections).length) {
        rendersUi = true;
      }
    });
    // If the recipe has UI rendering particles, at least one of the particles must render UI.
    return hasUi == rendersUi;
  }

  static scaleRelevance(relevance) {
    if (relevance == undefined) {
      relevance = 5;
    }
    relevance = Math.max(-1, Math.min(relevance, 10));
    // TODO: might want to make this geometric or something instead;
    return relevance / 5;
  }

  static particleRelevance(relevanceList) {
    let relevance = 1;
    let hasNegative = false;
    relevanceList.forEach(r => {
      let scaledRelevance = Relevance.scaleRelevance(r);
      if (scaledRelevance < 0) {
        hasNegative = true;
      }
      relevance *= Math.abs(scaledRelevance);
    });
    return relevance * (hasNegative ? -1 : 1);
  }

  calcParticleRelevance(particle) {
    if (this.relevanceMap.has(particle)) {
      return Relevance.particleRelevance(this.relevanceMap.get(particle));
    }
    return -1;
  }
}
export default Relevance;
