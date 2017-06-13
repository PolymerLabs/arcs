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
    for (let rList of this.relevanceMap.values()) {
      relevance *= Relevance.particleRelevance(rList);
    }
    return relevance;
  }

  static scaleRelevance(relevance) {
    if (relevance == undefined) {
      relevance = 5;
    }
    relevance = Math.max(0, Math.min(relevance, 10));
    // TODO: might want to make this geometric or something instead;
    return relevance / 5;
  }

  static particleRelevance(relevanceList) {
    let relevance = 1;
    relevanceList.forEach(r => relevance *= Relevance.scaleRelevance(r));
    return relevance;
  }

  calcParticleRelevance(particleName) {
    for (let key of this.relevanceMap.keys()) {
      if (key.particle.name == particleName)
        return Relevance.particleRelevance(this.relevanceMap.get(key));
    }
    return -1;
  }
}
module.exports = Relevance;
