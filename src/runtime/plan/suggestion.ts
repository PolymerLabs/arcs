/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {Manifest} from '../manifest.js';
import {Modality} from '../modality.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';
import {Relevance} from '../relevance.js';
import {Search} from '../recipe/search.js';

export class Plan {
  serialization: string;
  particles: {name: string}[] = [];
  handles: {id: string, tags: string[]}[] = [];
  slots: {id: string, name: string, tags: string[]}[] = [];
  modalities: string[] = [];

  constructor(serialization: string,
              particles: {name: string}[],
              handles: {id: string, tags: string[]}[],
              slots: {id: string, name: string, tags: string[]}[],
              modalities: string[]) {
    this.serialization = serialization;
    this.particles = particles;
    this.handles = handles;
    this.slots = slots;
    this.modalities = modalities;
  }

  static create(plan: Recipe): Plan {
    return new Plan(plan.toString(),
        plan.particles.map(p => ({name: p.name})),
        plan.handles.map(h => ({id: h.id, tags: h.tags})),
        plan.slots.map(s => ({id: s.id, name: s.name, tags: s.tags})),
        plan.getSupportedModalities());
  }
}

export class Suggestion {
  plan: Plan;
  // TODO: update Description class to be serializable.
  descriptionByModality = {};
  versionByStore = {};
  readonly hash: string;
  readonly rank: number;
  groupIndex: number; // TODO: only used in tests
  // List of search resolved token groups, this suggestion corresponds to.
  searchGroups: string[][] = [];

  static create(plan: Recipe, hash: string, relevance: Relevance): Suggestion {
    assert(plan, `plan cannot be null`);
    assert(hash, `hash cannot be null`);
    assert(relevance, `relevance cannot be null`);
    const suggestion = new Suggestion(Plan.create(plan), hash, relevance.calcRelevanceScore(),
        relevance.versionByStore);
    suggestion.setSearch(plan.search);
    return suggestion;
  }

  constructor(plan: Plan, hash: string, rank: number, versionByStore: {}) {
    assert(plan, `plan cannot be null`);
    assert(hash, `hash cannot be null`);
    this.plan = plan;
    this.hash = hash;
    this.rank = rank;
    this.versionByStore = versionByStore;
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
    for (const modality of this.plan.modalities) {
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

  toLiteral() {
    return {
      // Needs to JSON.strigify to avoid emitting empty strings and arrays.
      plan: JSON.stringify(this.plan),
      hash: this.hash,
      rank: this.rank,
      // Needs to JSON.strigify because store IDs may contain invalid FB key symbols.
      versionByStore: JSON.stringify(this.versionByStore),
      searchGroups: this.searchGroups,
      descriptionByModality: this.descriptionByModality
    };
  }

  static fromLiteral({plan, hash, rank, versionByStore, searchGroups, descriptionByModality}) {
    const suggestion = new Suggestion(JSON.parse(plan), hash, rank, JSON.parse(versionByStore || '{}'));
    suggestion.searchGroups = searchGroups || [];
    suggestion.descriptionByModality = descriptionByModality;
    return suggestion;
  }

  async instantiate(arc: Arc): Promise<void> {
    // For now shell is responsible for creating and setting the new arc.
    assert(arc, `Cannot instantiate suggestion without and arc`);
    const thePlan = await Suggestion.planFromString(this.plan.serialization, arc);
    return arc.instantiate(thePlan);
  }

  // TODO(mmandlis): temporarily used in shell's plan instantiation hack. 
  // Make private again, once fixed.
  static async planFromString(planString: string, arc: Arc): Promise<Recipe> {
    try {
      const manifest = await Manifest.parse(
          planString, {loader: arc.loader, context: arc.context, fileName: ''});
      assert(manifest.recipes.length === 1);
      let plan = manifest.recipes[0];
      assert(plan.normalize({}), `can't normalize deserialized suggestion: ${plan.toString()}`);
      if (!plan.isResolved()) {
        const recipeResolver = new RecipeResolver(arc);
        const resolvedPlan = await recipeResolver.resolve(plan);
        assert(resolvedPlan, `can't resolve plan: ${plan.toString({showUnresolved: true})}`);
        if (resolvedPlan) {
          plan = resolvedPlan;
        }
      }

      assert(manifest.stores.length === 0, `Unexpected stores in suggestion manifest.`);

      return plan;
    } catch (e) {
      console.error(`Failed to parse suggestion ${e}\n${planString}.`);
    }
    return null;
  }
}
