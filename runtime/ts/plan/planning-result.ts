/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {Arc} from '../arc';
import {now} from '../../../platform/date-web.js';
import {RecipeResolver} from '../recipe/recipe-resolver';
import {Suggestion} from './suggestion';

export class PlanningResult {
  arc: Arc;
  // TODO(mmandlis): Rename plans to suggestions everywhere.
  _plans: Suggestion[];
  lastUpdated: Date;
  generations: {}[];
  contextual = true;

  constructor(arc, result = {}) {
    assert(arc, 'Arc cannot be null');
    this.arc = arc;
    this._plans = result['plans'];
    this.lastUpdated = result['lastUpdated'] || new Date(null);
    this.generations = result['generations'] || [];
  }

  get plans(): Suggestion[] { return this._plans || []; }
  set plans(plans) {
    assert(Boolean(plans), `Cannot set uninitialized plans`);
    this._plans = plans;
  }

  set({plans, lastUpdated = new Date(), generations = [], contextual = true}) {
    if (this.isEquivalent(plans)) {
      return false;
    }
    this.plans = plans;
    this.generations = generations;
    this.lastUpdated = lastUpdated;
    this.contextual = contextual;
    return true;
  }

  append({plans, lastUpdated = new Date(), generations = []}) {
    const newPlans = plans.filter(newPlan => !this.plans.find(
        plan => plan.isEquivalent(newPlan)));
    if (newPlans.length === 0) {
      return false;
    }
    this.plans.push(...newPlans);
    // TODO: filter out generations of other plans.
    this.generations.push(...generations);
    this.lastUpdated = lastUpdated;
    return true;
  }

  olderThan(other) {
    return this.lastUpdated < other.lastUpdated;
  }

  isEquivalent(plans) {
    return PlanningResult.isEquivalent(this._plans, plans);
  }

  static isEquivalent(oldPlans, newPlans) {
    assert(newPlans, `New plans cannot be null.`);
    return oldPlans &&
           oldPlans.length === newPlans.length &&
           oldPlans.every(plan => newPlans.find(newPlan => plan.isEquivalent(newPlan)));
  }

  async deserialize({plans, lastUpdated}) {
    const recipeResolver = new RecipeResolver(this.arc);
    return this.set({
      plans: await Promise.all(plans.map(plan => Suggestion.deserialize(plan, this.arc, recipeResolver))),
      lastUpdated: new Date(lastUpdated),
      contextual: plans.contextual
    });
  }

  serialize() {
    return {
      plans: this.plans.map(plan => plan.serialize()),
      lastUpdated: this.lastUpdated.toString(),
      contextual: this.contextual
    };
  }
}
