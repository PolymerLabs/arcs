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
import {logFactory} from '../../platform/log-web.js';
import {Arc} from '../../runtime/arc.js';
import {Runnable} from '../../runtime/hot.js';
import {RecipeUtil} from '../../runtime/recipe/recipe-util.js';
import {SingletonStorageProvider} from '../../runtime/storage/storage-provider-base.js';
import {EnvOptions, Suggestion} from './suggestion.js';

const error = logFactory('PlanningResult', '#ff0090', 'error');

export type PlanningResultOptions = {
  suggestions: Suggestion[];
  lastUpdated?: Date;
  generations?: {population: {}[], record: {}}[];
  contextual?: boolean;
};

export type SerializableGeneration = {
  population: {}[];
  record: {};
};

export class PlanningResult {
  suggestions: Suggestion[] = [];
  lastUpdated: Date = new Date();
  generations: SerializableGeneration[] = [];
  contextual = true;
  store?: SingletonStorageProvider;
  private storeCallback: ({}) => void;
  private changeCallbacks: Runnable[] = [];
  private envOptions: EnvOptions;

  constructor(envOptions: EnvOptions, store?: SingletonStorageProvider) {
    this.envOptions = envOptions;
    assert(envOptions.context, `context cannot be null`);
    assert(envOptions.loader, `loader cannot be null`);
    this.store = store;
    if (this.store) {
      this.storeCallback = () => this.load();
      this.store.on('change', this.storeCallback, this);
    }
  }

  registerChangeCallback(callback) {
    this.changeCallbacks.push(callback);
  }

  onChanged() {
    for (const callback of this.changeCallbacks) {
      callback();
    }
  }

  async load(): Promise<boolean> {
    const value = await this.store.get() || {};
    if (value.suggestions) {
      if (await this.fromLiteral(value)) {
        return true;
      }
    }
    return false;
  }

  async flush() {
    try {
      await this.store.set(this.toLiteral());
    } catch (e) {
      error('Failed storing suggestions: ', e);
      throw e;
    }
  }

  async clear() {
    return this.store.clear();
  }

  dispose() {
    this.changeCallbacks = [];
    this.store.off('change', this.storeCallback);
    this.store.dispose();
  }
  
  static formatSerializableGenerations(generations): SerializableGeneration[] {
    // Make a copy of everything and assign IDs to recipes.
    const idMap = new Map(); // Recipe -> ID
    let lastID = 0;
    const assignIdAndCopy = recipe => {
      idMap.set(recipe, lastID);
      const {result, score, derivation, description, hash, valid, active, irrelevant} = recipe;
      const resultString = result.toString({showUnresolved: true, showInvalid: false, details: ''});
      const resolved = result.isResolved();
      return {result: resultString, resolved, score, derivation, description, hash, valid, active, irrelevant, id: lastID++};
    };
    generations = generations.map(pop => ({
      record: pop.record,
      generated: pop.generated.map(assignIdAndCopy)
    }));

    // Change recipes in derivation to IDs and compute resolved stats.
    return generations.map(pop => {
      const population = pop.generated;
      const record = pop.record;
      // Adding those here to reuse recipe resolution computation.
      record.resolvedDerivations = 0;
      record.resolvedDerivationsByStrategy = {};

      for (const item of population) {
        item.derivation = item.derivation.map(derivItem => {
          let parent;
          let strategy;
          if (derivItem.parent) {
            parent = idMap.get(derivItem.parent);
          }
          if (derivItem.strategy) {
            strategy = derivItem.strategy.constructor.name;
          }
          return {parent, strategy};
        });
        if (item.resolved) {
          record.resolvedDerivations++;
          const strategy = item.derivation[0].strategy;
          if (record.resolvedDerivationsByStrategy[strategy] === undefined) {
            record.resolvedDerivationsByStrategy[strategy] = 0;
          }
          record.resolvedDerivationsByStrategy[strategy]++;
        }
        const options = {showUnresolved: true, showInvalid: false, details: ''};
      }
      const populationMap = {};
      for (const item of population) {
        if (populationMap[item.derivation[0].strategy] == undefined) {
          populationMap[item.derivation[0].strategy] = [];
        }
        populationMap[item.derivation[0].strategy].push(item);
      }
      const result = {population: [], record};
      for (const strategy of Object.keys(populationMap)) {
        result.population.push({strategy, recipes: populationMap[strategy]});
      }
      return result;
    });
  }

  private _set({suggestions, lastUpdated = new Date(), generations = [], contextual = true}: PlanningResultOptions) {
    this.suggestions = suggestions;
    this.generations = generations;
    this.lastUpdated = lastUpdated;
    this.contextual = contextual;

    this.onChanged();
  }

  merge({suggestions, lastUpdated = new Date(), generations = [], contextual = true}: PlanningResultOptions, arc: Arc): boolean {
    const newSuggestions: Suggestion[] = [];
    const removeIndexes: number[] = [];
    const arcVersionByStore = arc.getVersionByStore({includeArc: true, includeContext: true});
    for (const newSuggestion of suggestions) {
      const index = this.suggestions.findIndex(
          suggestion => suggestion.isEquivalent(newSuggestion));
      if (index >= 0) {
        if (this.suggestions[index].isEqual(newSuggestion)) {
          continue; // skip suggestion, if identical to an existing one.
        }
        const outdatedStores = Object.keys(newSuggestion.versionByStore).filter(storeId => {
          const currentVersion = this.suggestions[index].versionByStore[storeId];
          return currentVersion === undefined || newSuggestion.versionByStore[storeId] < currentVersion;
        });
        if (outdatedStores.length > 0) {
          console.warn(`New suggestions has older store versions:\n ${outdatedStores.map(id => `${id}: ${this.suggestions[index].versionByStore[id]} -> ${newSuggestion.versionByStore[id]}`).join(';')}`);
          // Note: This happens due to #2638. Revisit, when fixed.
          // assert(false);
        }
        removeIndexes.push(index);
        newSuggestion.mergeSearch(this.suggestions[index]);
      }
      if (this._isUpToDate(newSuggestion, arcVersionByStore)) {
        newSuggestions.push(newSuggestion);
      }
    }

    // Keep suggestions (1) not marked for remove (2) up-to-date with the arcs store versions and
    // (3) not in active recipe.
    const jointSuggestions = this.suggestions.filter((suggestion, index) => {
      return !removeIndexes.some(removeIndex => removeIndex === index) &&
              this._isUpToDate(suggestion, arcVersionByStore) &&
              !RecipeUtil.matchesRecipe(arc.activeRecipe, suggestion.plan);
    });
    if (jointSuggestions.length === this.suggestions.length && newSuggestions.length === 0) {
      return false;
    }

    jointSuggestions.push(...newSuggestions);
    this._set({suggestions: jointSuggestions, generations: this.generations.concat(...generations), lastUpdated, contextual: contextual && this.contextual});
    return true;
  }

  private _isUpToDate(suggestion: Suggestion, versionByStore: {}): boolean {
     for (const handle of suggestion.plan.handles) {
      const arcVersion = versionByStore[handle.id] || 0;
      const relevanceVersion = suggestion.versionByStore[handle.id] || 0;
      if (relevanceVersion < arcVersion) {
        return false;
      }
    }
    return true;
  }

  isEquivalent(suggestions) {
    return PlanningResult.isEquivalent(this.suggestions, suggestions);
  }

  static isEquivalent(oldSuggestions, newSuggestions) {
    assert(newSuggestions, `New suggestions cannot be null.`);
    return oldSuggestions &&
           oldSuggestions.length === newSuggestions.length &&
           oldSuggestions.every(suggestion => newSuggestions.find(newSuggestion => suggestion.isEquivalent(newSuggestion)));
  }

  async fromLiteral({suggestions, generations, lastUpdated, contextual}: {suggestions, generations?, lastUpdated?: Date, contextual?: boolean}): Promise<boolean> {
    const deserializedSuggestions: Suggestion[] = [];
    for (const suggestion of suggestions) {
      deserializedSuggestions.push(await Suggestion.fromLiteral(suggestion, this.envOptions));
    }

    if (this.isEquivalent(deserializedSuggestions)) {
      return false;
    }

    this._set({
      suggestions: deserializedSuggestions,
      generations: JSON.parse(generations || '[]'),
      lastUpdated: new Date(lastUpdated),
      contextual
    });
    return true;
  }

  toLiteral() {
    return {
      suggestions: this.suggestions.map(suggestion => suggestion.toLiteral()),
      generations: JSON.stringify(this.generations),
      lastUpdated: this.lastUpdated.toString(),
      contextual: this.contextual
    };
  }
}
