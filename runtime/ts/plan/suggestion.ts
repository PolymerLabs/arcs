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
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {InitSearch} from '../strategies/init-search.js';
import {InterfaceType} from '../type.js';
import {logFactory} from '../../../platform/log-web.js';
import {Manifest} from '../manifest.js';
import {now} from '../../../platform/date-web.js';
import {Planner} from '../planner.js';
import {PlanningResult} from './planning-result.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';
import {Relevance} from '../relevance.js';
import {Search} from '../recipe/search.js';
import {Speculator} from '../speculator.js';
import {StorageProviderBase} from '../storage/storage-provider-base.js';

export class Suggestion {
  arc: Arc;
  plan: Recipe;
  // TODO: figure out how to better approach description.
  description: Description;
  descriptionText: string;
  descriptionDom: {};
  relevance: Relevance;
  readonly hash: string;
  readonly rank: number;
  groupIndex: number; // TODO: only used in tests
  // List of search resolved token groups, this suggestion corresponds to.
  searchGroups: string[][] = [];

  constructor(plan: Recipe, hash: string, rank: number, arc: Arc) {
    assert(plan, `plan cannot be null`);
    assert(hash, `hash cannot be null`);
    this.plan = plan;
    this.hash = hash;
    this.rank = rank;
    this.arc = arc;
  }

  isEquivalent(other: Suggestion): boolean {
    return (this.hash === other.hash) && (this.descriptionText === other.descriptionText);
  }

  static compare(s1: Suggestion, s2: Suggestion): number {
    return s2.rank - s1.rank;
  }

  hasSearch(search: string): boolean {
    const tokens = search.split(' ');
    return this.searchGroups.some(group => tokens.every(token => group.includes(token)));
  }

  setSearch(search: Search) {
    this.searchGroups = [];
    if (search) {
      this._addSearch(search.resolvedTokens);
    }
  }

  mergeSearch(suggestion: Suggestion) {
    let updated = false;
    for (const other of suggestion.searchGroups) {
      if (this._addSearch(other)) {
        if (this.searchGroups.length === 1) {
          this.searchGroups.push(['']);
        }
        updated = true;
      }
    }
    this.searchGroups.sort();
    return updated;
  }

  _addSearch(searchGroup: string[]): boolean {
    const equivalentGroup = (group, otherGroup) => {
      return group.length === otherGroup.length &&
             group.every(token => otherGroup.includes(token));
    };
    if (!this.searchGroups.find(group => equivalentGroup(group, searchGroup))) {
      this.searchGroups.push(searchGroup);
      return true;
    }
    return false;
  }

  serialize() {
    return {
      plan: this._planToString(this.plan),
      hash: this.hash,
      rank: this.rank,
      descriptionText: this.descriptionText,
      descriptionDom: {template: this.descriptionText, model: {}},
      searchGroups: this.searchGroups
    };
  }

  static async deserialize({plan, hash, rank, descriptionText, descriptionDom, searchGroups}, arc, recipeResolver): Promise<Suggestion> {
    const deserializedPlan = await Suggestion._planFromString(plan, arc, recipeResolver);
    if (deserializedPlan) {
      const suggestion = new Suggestion(deserializedPlan, hash, rank, arc);
      suggestion.descriptionText = descriptionText;
      suggestion.descriptionDom = descriptionDom;
      suggestion.searchGroups = searchGroups;
      return suggestion;
    }
    return undefined;
  }

  async instantiate() {
    // For now shell is responsible for creating and setting the new arc.
    assert(this.arc, `Cannot instantiate suggestion without and arc`);
    if (this.arc) {
      return this.arc.instantiate(this.plan);
    }
  }

  _planToString(plan): string {
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
          assert(conn['type'] instanceof InterfaceType);
          conn['_handle'] = {localName: hostedParticleName};
        });

        // Remove the handle.
        planClone.handles.splice(i, 1);
        --i;
      }
    }
    return `${hostedParticleSpecs.join('\n')}\n${planClone.toString()}`;
  }

  static async _planFromString(planString, arc, recipeResolver) {
    try {
      const manifest = await Manifest.parse(
          planString, {loader: arc.loader, context: arc.context, fileName: ''});
      assert(manifest.recipes.length === 1);
      let plan = manifest.recipes[0];
      assert(plan.normalize({}), `can't normalize deserialized suggestion: ${plan.toString()}`);
      if (!plan.isResolved()) {
        const resolvedPlan = await recipeResolver.resolve(plan);
        assert(resolvedPlan, `can't resolve plan: ${plan.toString({showUnresolved: true})}`);
        if (resolvedPlan) {
          plan = resolvedPlan;
        }
      }
      for (const store of manifest.stores) {
        // If recipe has hosted particles, manifest will have stores with hosted
        // particle specs. Moving these stores into the current arc's context.
        // TODO: This is a hack, find a proper way of doing this.
        arc.context._addStore(store, []);
      }
      return plan;
    } catch (e) {
      console.error(`Failed to parse suggestion ${e}.`);
    }
    return null;
  }
}
