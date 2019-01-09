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
import {logFactory} from '../../platform/log-web.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {Suggestion} from './suggestion.js';
import {VariableStorageProvider} from '../storage/storage-provider-base.js';

const error = logFactory('PlanningResult', '#ff0090', 'error');

export type PlanningResultOptions = {
  suggestions: Suggestion[];
  lastUpdated?: Date;
  generations?: {population: {}[], record: {}}[];
  contextual?: boolean;
};

export class PlanningResult {
  _suggestions: Suggestion[];
  lastUpdated: Date = new Date(null);
  generations: {}[] = [];
  contextual = true;
  store: VariableStorageProvider;
  private storeCallback: ({}) => void;
  private changeCallbacks: (() => void)[] = [];

  constructor(store?: VariableStorageProvider) {
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
      if (this.fromLiteral(value)) {
        return true;
      }
    }
    return false;
  }

  async flush() {
    try {
      await this.store.set(this.toLiteral());
    } catch(e) {
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
  
  get suggestions(): Suggestion[] { return this._suggestions || []; }
  set suggestions(suggestions) {
    assert(Boolean(suggestions), `Cannot set uninitialized suggestions`);
    this._suggestions = suggestions;
  }

  static formatSerializableGenerations(generations) {
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

      population.forEach(item => {
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
      });
      const populationMap = {};
      population.forEach(item => {
        if (populationMap[item.derivation[0].strategy] == undefined) {
          populationMap[item.derivation[0].strategy] = [];
        }
        populationMap[item.derivation[0].strategy].push(item);
      });
      const result = {population: [], record};
      Object.keys(populationMap).forEach(strategy => {
        result.population.push({strategy, recipes: populationMap[strategy]});
      });
      return result;
    });
  }

  set({suggestions, lastUpdated = new Date(), generations = [], contextual = true}: PlanningResultOptions): boolean {
    if (this.isEquivalent(suggestions)) {
      return false;
    }
    this.suggestions = suggestions;
    this.generations = generations;
    this.lastUpdated = lastUpdated;
    this.contextual = contextual;

    this.onChanged();
    return true;
  }

  merge({suggestions, lastUpdated = new Date(), generations = [], contextual = true}: PlanningResultOptions, arc: Arc): boolean {
    if (this.isEquivalent(suggestions)) {
      return false;
    }

    const jointSuggestions: Suggestion[] = [];
    const arcVersionByStore = arc.getVersionByStore({includeArc: true, includeContext: true});

     // For all existing suggestions, keep the ones still up to date.
    for (const currentSuggestion of this.suggestions) {
      const newSuggestion = suggestions.find(suggestion => suggestion.hash === currentSuggestion.hash);
      if (newSuggestion) {
        // Suggestion with this hash exists in the new suggestions list.
        const upToDateSuggestion = this._getUpToDate(currentSuggestion, newSuggestion, arcVersionByStore);
        if (upToDateSuggestion) {
          jointSuggestions.push(upToDateSuggestion);
        }
      } else {
        // Suggestion with this hash does not exist in the new suggestions list.
        // Add it to the joint suggestions list, iff it's up-to-date and not in the active recipe.
        if (this._isUpToDate(currentSuggestion, arcVersionByStore) &&
            !RecipeUtil.matchesRecipe(arc.activeRecipe, currentSuggestion.plan))  {
          jointSuggestions.push(currentSuggestion);
        }
      }
    }
    for (const newSuggestion of suggestions) {
      if (!this.suggestions.find(suggestion => suggestion.hash === newSuggestion.hash)) {
        if (this._isUpToDate(newSuggestion, arcVersionByStore)) {
          jointSuggestions.push(newSuggestion);
        }
      }
    }
    return this.set({suggestions: jointSuggestions, lastUpdated, generations, contextual});
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

   private _getUpToDate(currentSuggestion: Suggestion, newSuggestion: Suggestion, versionByStore: {}): Suggestion|null {
    const newUpToDate = this._isUpToDate(newSuggestion, versionByStore);
    const currentUpToDate = this._isUpToDate(currentSuggestion, versionByStore);
    if (newUpToDate && currentUpToDate) {
      const newVersions = newSuggestion.versionByStore;
      const currentVersions = currentSuggestion.versionByStore;
      assert(Object.keys(newVersions).length === Object.keys(currentVersions).length);
      if (Object.entries(newVersions).every(
          ([id, newVersion]) => currentVersions[id] !== undefined && newVersion >= currentVersions[id])) {
        return newSuggestion;
      }
      assert(Object.entries(currentVersions).every(([id, currentVersion]) => newVersions[id] !== undefined
             && currentVersion >= newVersions[id]),
             `Inconsistent store versions for suggestions with hash: ${newSuggestion.hash}`);
      return currentSuggestion;
    }
    if (newUpToDate) {
      return newSuggestion;
    }
    if (currentUpToDate) {
      return currentSuggestion;
    }
    console.warn(`None of the suggestions for hash ${newSuggestion.hash} is up to date.`);
    return null;
  }

  append({suggestions, lastUpdated = new Date(), generations = []}: PlanningResultOptions): boolean {
    const newSuggestions = [];
    let searchUpdated = false;
    for (const newSuggestion of suggestions) {
      const existingSuggestion =
          this.suggestions.find(suggestion => suggestion.isEquivalent(newSuggestion));
      if (existingSuggestion) {
        searchUpdated = existingSuggestion.mergeSearch(newSuggestion);
      } else {
        newSuggestions.push(newSuggestion);
      }
    }

    if (newSuggestions.length > 0) {
      this.suggestions = this.suggestions.concat(newSuggestions);
    } else {
      if (!searchUpdated) {
        return false;
      }
    }

    // TODO: filter out generations of other suggestions.
    this.generations.push(...generations);
    this.lastUpdated = lastUpdated;

    this.onChanged();
    return true;
  }

  olderThan(other) {
    return this.lastUpdated < other.lastUpdated;
  }

  isEquivalent(suggestions) {
    return PlanningResult.isEquivalent(this._suggestions, suggestions);
  }

  static isEquivalent(oldSuggestions, newSuggestions) {
    assert(newSuggestions, `New suggestions cannot be null.`);
    return oldSuggestions &&
           oldSuggestions.length === newSuggestions.length &&
           oldSuggestions.every(suggestion => newSuggestions.find(newSuggestion => suggestion.isEquivalent(newSuggestion)));
  }

  fromLiteral({suggestions, generations, lastUpdated}: {suggestions, generations?, lastUpdated?: Date}) {
    return this.set({
      suggestions: suggestions.map(suggestion => Suggestion.fromLiteral(suggestion)).filter(s => s),
      generations: JSON.parse(generations || '[]'),
      lastUpdated: new Date(lastUpdated),
      contextual: suggestions.contextual
    });
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
