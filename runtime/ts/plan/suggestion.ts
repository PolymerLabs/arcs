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
import {Manifest} from '../manifest.js';
import {Modality} from '../modality';
import {Recipe} from '../recipe/recipe.js';
import {Relevance} from '../relevance.js';
import {Search} from '../recipe/search.js';
import {StorageProviderBase} from '../storage/storage-provider-base.js';

export class Suggestion {
  arc: Arc;
  plan: Recipe;
  // TODO: update Description class to be serializable.
  descriptionByModality = {};
  relevance: Relevance;
  readonly hash: string;
  readonly rank: number;
  groupIndex: number; // TODO: only used in tests
  // List of search resolved token groups, this suggestion corresponds to.
  searchGroups: string[][] = [];

  constructor(plan: Recipe, hash: string, relevance: Relevance, arc: Arc) {
    assert(plan, `plan cannot be null`);
    assert(hash, `hash cannot be null`);
    this.plan = plan;
    this.hash = hash;
    this.rank = relevance.calcRelevanceScore();
    this.relevance = relevance;
    this.arc = arc;
  }

  get descriptionText() {
    return this.getDescription('text') as string;
  }

  getDescription(modality: string): string|{} {
    assert(this.descriptionByModality[modality], `No description for modality '${modality}'`);
    return this.descriptionByModality[modality];
  }

  async setDescription(description: Description) {
    this.descriptionByModality['text'] = await description.getRecipeSuggestion();
    const modality = this.arc.pec.slotComposer && this.arc.pec.slotComposer.modality;
    if (modality && modality !== 'text') {
      this.descriptionByModality[modality] =
        await description.getRecipeSuggestion(Modality.forName(modality).descriptionFormatter);
    }
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
      relevance: this.relevance.serialize(),
      searchGroups: this.searchGroups,
      descriptionByModality: this.descriptionByModality
    };
  }

  static async deserialize({plan, hash, relevance, searchGroups, descriptionByModality}, arc, recipeResolver): Promise<Suggestion> {
    const deserializedPlan = await Suggestion._planFromString(plan, arc, recipeResolver);
    if (deserializedPlan) {
      const suggestion = new Suggestion(deserializedPlan, hash, Relevance.deserialize(relevance, deserializedPlan), arc);
      suggestion.searchGroups = searchGroups || [];
      suggestion.descriptionByModality = descriptionByModality;
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

  _planToString(plan) {
    if (plan.slots.every(slot => Boolean(slot.id))) {
      return plan.toString();
    }

    // Special handling needed for plans with local slot (ie missing slot IDs).
    const planClone = plan.clone();
    planClone.slots.forEach(slot => slot.id = slot.id || `slotid-${this.arc.generateID()}`);
    return planClone.toString();
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
