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
import {Arc} from '../../runtime/arc.js';
import {Consumer} from '../../runtime/hot.js';

import {PlanningResult} from './planning-result.js';
import {Suggestion, SuggestionVisibilityOptions} from './suggestion.js';
import {SuggestFilter} from './suggest-filter.js';
import {PlannerInspector} from '../planner-inspector.js';

export type VisibilityOptions = {reasons?: Map<string, SuggestionVisibilityOptions>};

export class PlanConsumer {
  readonly arc: Arc;
  result: PlanningResult;
  suggestFilter = new SuggestFilter(false);
  // Callback is triggered when planning results have changed.
  private suggestionsChangeCallbacks: Consumer<{suggestions: Suggestion[]}>[] = [];
  // Callback is triggered when suggestions visible to the user have changed.
  private visibleSuggestionsChangeCallbacks: Consumer<Suggestion[]>[] = [];
  currentSuggestions: Suggestion[] = [];
  readonly inspector?: PlannerInspector;

  constructor(arc: Arc, result: PlanningResult, inspector?: PlannerInspector) {
    assert(arc, 'arc cannot be null');
    assert(result, 'result cannot be null');
    this.arc = arc;
    this.result = result;
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];
    this.inspector = inspector;
    this.result.registerChangeCallback(() => this.onSuggestionsChanged());
    this._maybeUpdateStrategyExplorer();
  }

  registerSuggestionsChangedCallback(callback: Consumer<{suggestions: Suggestion[]}>): void {
    this.suggestionsChangeCallbacks.push(callback);
  }

  registerVisibleSuggestionsChangedCallback(callback: Consumer<Suggestion[]>): void {
    this.visibleSuggestionsChangeCallbacks.push(callback);
    // TODO(sjmiles): notify new listener about current state
    callback(this.getCurrentSuggestions());
  }

  setSuggestFilter(showAll: boolean, search?: string): void {
    assert(!showAll || !search);
    if (this.suggestFilter.isEquivalent(showAll, search)) {
      return;
    }
    this.suggestFilter = new SuggestFilter(showAll, search);
    this._onMaybeSuggestionsChanged();
  }

  onSuggestionsChanged(): void {
    this._onSuggestionsChanged();
    this._onMaybeSuggestionsChanged();
    this._maybeUpdateStrategyExplorer();
  }

  getCurrentSuggestions(options?: VisibilityOptions): Suggestion[] {
    return this.result.suggestions.filter(suggestion => {
      const suggestOption: SuggestionVisibilityOptions|undefined = options && options.reasons ? {reasons: []} : undefined;
      const isVisible = suggestion.isVisible(this.arc, this.suggestFilter, suggestOption);
      if (options && options.reasons) {
        options.reasons.set(suggestion.hash, suggestOption);
      }
      return isVisible;
    });
  }

  dispose(): void {
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];
  }

  private _onSuggestionsChanged(): void {
    this.suggestionsChangeCallbacks.forEach(callback => callback({suggestions: this.result.suggestions}));
    if (this.inspector) {
      this.inspector.updatePlanningResults(this.result, {});
      this.inspector.updateVisibleSuggestions(this.result.suggestions, {reasons: new Map()});
    }
  }

  private _onMaybeSuggestionsChanged(): void {
    const options: VisibilityOptions|undefined = this.inspector ? {reasons: new Map<string, SuggestionVisibilityOptions>()} : undefined;
    const suggestions = this.getCurrentSuggestions(options);
    if (!PlanningResult.isEquivalent(this.currentSuggestions, suggestions)) {
      this.visibleSuggestionsChangeCallbacks.forEach(callback => callback(suggestions));
      this.currentSuggestions = suggestions;
      if (this.inspector) {
        this.inspector.updateVisibleSuggestions(this.currentSuggestions, options);
      }
    }
  }

  private _maybeUpdateStrategyExplorer(): void {
    if (this.result.generations.length && this.inspector) {
      this.inspector.strategizingRecord(this.result.generations, {label: 'Plan Consumer', keep: true});
    }
  }
}
