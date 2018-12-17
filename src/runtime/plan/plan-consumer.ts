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
import {PlanningResult} from './planning-result.js';
import {Suggestion} from './suggestion.js';
import {SuggestionComposer} from '../suggestion-composer.js';
import {DevtoolsConnection} from '../debug/devtools-connection.js';
import {StrategyExplorerAdapter} from '../debug/strategy-explorer-adapter.js';
import {Modality} from '../modality.js';

type Callback = ({}) => void;

export class PlanConsumer {
  arc: Arc;
  result: PlanningResult;
  suggestFilter: {showAll: boolean, search?};
  // Callback is triggered when planning results have changed.
  private suggestionsChangeCallbacks: Callback[] = [];
  // Callback is triggered when suggestions visible to the user have changed.
  private visibleSuggestionsChangeCallbacks: Callback[] = [];
  suggestionComposer: SuggestionComposer|null = null;
  currentSuggestions: Suggestion[] = [];

  constructor(arc: Arc, result: PlanningResult) {
    assert(arc, 'arc cannot be null');
    assert(result, 'result cannot be null');
    this.arc = arc;
    this.result = result;
    this.suggestFilter = {showAll: false};
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];

    this._initSuggestionComposer();

    this.result.registerChangeCallback(() => this.onSuggestionsChanged());
  }

  registerSuggestionsChangedCallback(callback) { this.suggestionsChangeCallbacks.push(callback); }
  registerVisibleSuggestionsChangedCallback(callback) { this.visibleSuggestionsChangeCallbacks.push(callback); }

  setSuggestFilter(showAll: boolean, search?: string) {
    assert(!showAll || !search);
    if (this.suggestFilter['showAll'] === showAll && this.suggestFilter['search'] === search) {
      return;
    }
    this.suggestFilter = {showAll, search};
    this._onMaybeSuggestionsChanged();
  }

  onSuggestionsChanged() {
    this._onSuggestionsChanged();
    this._onMaybeSuggestionsChanged();

    if (this.result.generations.length && DevtoolsConnection.isConnected) {
      StrategyExplorerAdapter.processGenerations(this.result.generations, DevtoolsConnection.get().forArc(this.arc));
    }
  }

  getCurrentSuggestions(): Suggestion[] {
    const suggestions = this.result.suggestions.filter(
        suggestion => suggestion.plan.slots.length > 0
                      && this.arc.modality.isCompatible(suggestion.plan.modality.map(m => m.name)));

    // `showAll`: returns all suggestions that render into slots.
    if (this.suggestFilter['showAll']) {
      // Should filter out suggestions produced by search phrases?
      return suggestions;
    }

    // search filter non empty: match plan search phrase or description text.
    if (this.suggestFilter['search']) {
      return suggestions.filter(suggestion =>
        suggestion.descriptionText.toLowerCase().includes(this.suggestFilter['search']) ||
        suggestion.hasSearch(this.suggestFilter['search']));
    }

    return suggestions.filter(suggestion => {
      const usesHandlesFromActiveRecipe = suggestion.plan.handles.find(handle => {
        // TODO(mmandlis): find a generic way to exlude system handles (eg Theme),
        // either by tagging or by exploring connection directions etc.
        return !!handle.id &&
               !!this.arc.activeRecipe.handles.find(activeHandle => activeHandle.id === handle.id);
      });
      const usesRemoteNonRootSlots = suggestion.plan.slots.find(slot => {
        return !slot.name.includes('root') && !slot.tags.includes('root') &&
               slot.id && !slot.id.includes('root') &&
               Boolean(this.arc.pec.slotComposer.findContextById(slot.id));
      });
      const onlyUsesNonRootSlots =
          !suggestion.plan.slots.find(s => s.name.includes('root') || s.tags.includes('root'));
      return (usesHandlesFromActiveRecipe && usesRemoteNonRootSlots) || onlyUsesNonRootSlots;
    });
  }

  dispose() {
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];
    if (this.suggestionComposer) {
      this.suggestionComposer.clear();
    }
  }

  _onSuggestionsChanged() {
    this.suggestionsChangeCallbacks.forEach(callback => callback({suggestions: this.result.suggestions}));
  }

  _onMaybeSuggestionsChanged() {
    const suggestions = this.getCurrentSuggestions();
    if (!PlanningResult.isEquivalent(this.currentSuggestions, suggestions)) {
      this.visibleSuggestionsChangeCallbacks.forEach(callback => callback(suggestions));
      this.currentSuggestions = suggestions;
    }
  }

  _initSuggestionComposer() {
    const composer = this.arc.pec.slotComposer;
    if (composer && composer.findContextById('rootslotid-suggestions')) {
      this.suggestionComposer = new SuggestionComposer(this.arc, composer);
      this.registerVisibleSuggestionsChangedCallback(
          (suggestions) => this.suggestionComposer.setSuggestions(suggestions));
    }
  }
}
