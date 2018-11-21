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
  _suggestions: Suggestion[];
  lastUpdated: Date;
  _generations: {}[];
  contextual = true;

  constructor(arc, result = {}) {
    assert(arc, 'Arc cannot be null');
    this.arc = arc;
    this._suggestions = result['suggestions'];
    this.lastUpdated = result['lastUpdated'] || new Date(null);
    this.generations = result['generations'] || [];
  }

  get suggestions(): Suggestion[] { return this._suggestions || []; }
  set suggestions(suggestions) {
    assert(Boolean(suggestions), `Cannot set uninitialized suggestions`);
    this._suggestions = suggestions;
  }
  get generations(): {}[] { return this._generations; }
  set generations(generations: {}[]) {
    this._generations = PlanningResult.formatSerializableGenerations(generations);
  }

  static formatSerializableGenerations(generations) {
    for (const g of generations) {
      for (const gg of g['generated']) {
        if (gg.result) {
          gg.resultString = gg.result.toString({showUnresolved: true, showInvalid: false, details: ''});
          gg.isResolved = gg.result.isResolved();
          delete gg.result;
        }
        for (const d of gg.derivation) {
          d.strategy = (typeof d.strategy === 'string') ? d.strategy : d.strategy.constructor.name;
        }
      }
    }
    return generations;
  }

  set({suggestions, lastUpdated = new Date(), generations = [], contextual = true}) {
    if (this.isEquivalent(suggestions)) {
      return false;
    }
    this.suggestions = suggestions;
    this.generations = generations;
    this.lastUpdated = lastUpdated;
    this.contextual = contextual;
    return true;
  }

  append({suggestions, lastUpdated = new Date(), generations = []}) {
    const newSuggestions = suggestions.filter(newSuggestion => !this.suggestions.find(
        suggestion => suggestion.isEquivalent(newSuggestion)));
    if (newSuggestions.length === 0) {
      return false;
    }
    this.suggestions.push(...newSuggestions);
    // TODO: filter out generations of other suggestions.
    this.generations.push(...generations);
    this.lastUpdated = lastUpdated;
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

  serialize() {
    return {
      suggestions: this.suggestions.map(suggestion => suggestion.serialize()),
      generations: JSON.stringify(this.generations),
      lastUpdated: this.lastUpdated.toString(),
      contextual: this.contextual
    };
  }
}
