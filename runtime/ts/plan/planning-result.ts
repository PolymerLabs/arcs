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
import {Manifest} from '../manifest';
import {RecipeResolver} from '../recipe/recipe-resolver';

export class PlanningResult {
  arc: Arc;
  recipeResolver: RecipeResolver;
  _plans: {}[];
  lastUpdated: Date;
  generations: {}[];
  contextual = true;

  constructor(arc, result = {}) {
    assert(arc, 'Arc cannot be null');
    this.arc = arc;
    this.recipeResolver = new RecipeResolver(this.arc);
    this._plans = result['plans'];
    this.lastUpdated = result['lastUpdated'] || new Date(null);
    this.generations = result['generations'] || [];
  }

  get plans() { return this._plans || []; }
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
    const newPlans = plans.filter(newPlan => !this.plans.find(plan => PlanningResult.isEquivalentPlan(plan, newPlan.hash)));
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
        oldPlans.every(plan => newPlans.find(newPlan => PlanningResult.isEquivalentPlan(plan, newPlan)));
  }

  static isEquivalentPlan(plan1, plan2) {
    return (plan1.hash === plan2.hash) && (plan1.descriptionText === plan2.descriptionText);
  }

  async deserialize({plans, lastUpdated}) {
    const deserializedPlans = [];
    for (const {descriptionText, recipe, hash, rank, suggestionContent} of plans) {
      try {
        deserializedPlans.push({
          plan: await this._planFromString(recipe),
          descriptionText,
          hash,
          rank,
          suggestionContent
        });
      } catch (e) {
        console.error(`Failed to parse plan ${e}.`);
      }
    }
    return this.set({
      plans: deserializedPlans,
      lastUpdated: new Date(lastUpdated),
      contextual: plans.contextual
    });
  }

  async _planFromString(planString) {
    const manifest = await Manifest.parse(
        planString, {loader: this.arc.loader, context: this.arc.context, fileName: ''});
    assert(manifest.recipes.length === 1);
    let plan = manifest.recipes[0];
    assert(plan.normalize({}), `can't normalize deserialized suggestion: ${plan.toString()}`);
    if (!plan.isResolved()) {
      const resolvedPlan = await this.recipeResolver.resolve(plan);
      assert(resolvedPlan, `can't resolve plan: ${plan.toString({showUnresolved: true})}`);
      if (resolvedPlan) {
        plan = resolvedPlan;
      }
    }
    for (const store of manifest.stores) {
      // If recipe has hosted particles, manifest will have stores with hosted
      // particle specs. Moving these stores into the current arc's context.
      // TODO: This is a hack, find a proper way of doing this.
      this.arc.context._addStore(store, []);
    }
    return plan;
  }

  serialize() {
    const serializedPlans = [];
    for (const plan of this.plans) {
      serializedPlans.push({
        recipe: this._planToString(plan['plan']),
        hash: plan['hash'],
        rank: plan['rank'],
        // TODO: handle description
        descriptionText: plan['descriptionText'],
        suggestionContent: {template: plan['descriptionText'], model: {}}
      });
    }
    return {
      plans: serializedPlans,
      lastUpdated: this.lastUpdated.toString(),
      contextual: this.contextual
    };
  }

  _planToString(plan) {
    // Special handling is only needed for plans (1) with hosted particles or
    // (2) local slot (ie missing slot IDs).
    if (!plan.handles.some(h => h.id && h.id.includes('particle-literal')) &&
        plan.slots.every(slot => Boolean(slot.id))) {
      return plan.toString();
    }

    // TODO: This is a transformation particle hack for plans resolved by
    // FindHostedParticle strategy. Find a proper way to do this.
    // Update hosted particle handles and connections.
    const planClone = plan.clone();
    planClone.slots.forEach(slot => slot.id = slot.id || `slotid-${this.arc.generateID()}`);

    const hostedParticleSpecs = [];
    for (let i = 0; i < planClone.handles.length; ++i) {
      const handle = planClone.handles[i];
      if (handle.id && handle.id.includes('particle-literal')) {
        const hostedParticleName = handle.id.substr(handle.id.lastIndexOf(':') + 1);
        // Add particle spec to the list.
        const hostedParticleSpec = this.arc.context.findParticleByName(hostedParticleName);
        assert(hostedParticleSpec, `Cannot find spec for particle '${hostedParticleName}'.`);
        hostedParticleSpecs.push(hostedParticleSpec.toString());

        // Override handle conenctions with particle name as local name.
        Object.values(handle.connections).forEach(conn => {
          assert(conn['type'].isInterface);
          conn['_handle'] = {localName: hostedParticleName};
        });

        // Remove the handle.
        planClone.handles.splice(i, 1);
        --i;
      }
    }
    return `${hostedParticleSpecs.join('\n')}\n${planClone.toString()}`;
  }
}
