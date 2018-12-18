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
import {Arc} from '../arc.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';
import {StorageProviderBase} from '../storage/storage-provider-base.js';
import {Suggestion} from './suggestion.js';

const error = logFactory('PlanningResult', '#ff0090', 'error');

export class PlanningResult {
  arc: Arc;
  _suggestions: Suggestion[];
  lastUpdated: Date = new Date(null);
  generations: {}[] = [];
  contextual = true;
  store: StorageProviderBase;
  private storeCallback: ({}) => void;
  private changeCallbacks: (() => void)[] = [];

  constructor(arc, store) {
    assert(arc, 'Arc cannot be null');
    this.arc = arc;
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
    assert(this.store['get'], 'Unsupported getter in suggestion storage');
    const value = await this.store['get']() || {};
    if (value.suggestions) {
      if (await this.deserialize(value)) {
        this.onChanged();
        return true;
      }
    }
    return false;
  }

  async flush() {
    try {
      assert(this.store['set'], 'Unsupported setter in suggestion storage');
      await this.store['set'](this.serialize());
    } catch(e) {
      error('Failed storing suggestions: ', e);
      throw e;
    }
  }

  async clear() {
    return this.store['clear']();
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

  set({suggestions, lastUpdated = new Date(), generations = [], contextual = true}) {
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

  append({suggestions, lastUpdated = new Date(), generations = []}) {
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

  async deserialize({suggestions, generations, lastUpdated}) {
    const recipeResolver = new RecipeResolver(this.arc);
    return this.set({
      suggestions: (await Promise.all(suggestions.map(
          suggestion => Suggestion.deserialize(suggestion, this.arc, recipeResolver)))).filter(s => s),
      generations: JSON.parse(generations || '[]'),
      lastUpdated: new Date(lastUpdated),
      contextual: suggestions.contextual
    });
  }

  serialize(): {} {
    return {
      suggestions: this.suggestions.map(suggestion => suggestion.serialize()),
      generations: JSON.stringify(this.generations),
      lastUpdated: this.lastUpdated.toString(),
      contextual: this.contextual
    };
  }
}
