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
import {Recipe} from '../recipe/recipe.js';
import {PlanningResult} from './planning-result.js';
import {StorageProviderBase} from '../storage/storage-provider-base.js';
import {Suggestion} from './suggestion.js';
import {SuggestionComposer} from '../suggestion-composer.js';
import {DevtoolsConnection} from '../../debug/devtools-connection.js';
import {StrategyExplorerAdapter} from '../../debug/strategy-explorer-adapter.js';

type Callback = ({}) => void;

export class PlanConsumer {
  arc: Arc;
  result: PlanningResult;
  store: StorageProviderBase;
  suggestFilter: {};
  // Callback is triggered when planning results have changed.
  suggestionsChangeCallbacks: Callback[] = [];
  // Callback is triggered when suggestions visible to the user have changed.
  visibleSuggestionsChangeCallbacks: Callback[] = [];
  storeCallback: Callback;
  suggestionComposer: SuggestionComposer|null = null;

  constructor(arc: Arc, store: StorageProviderBase) {
    assert(arc, 'arc cannot be null');
    assert(store, 'store cannot be null');
    this.arc = arc;
    this.result = new PlanningResult(arc);
    this.store = store;
    this.suggestFilter = {showAll: false};
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];

    this.storeCallback = () => this.loadSuggestions();
    this.store.on('change', this.storeCallback, this);

    this._initSuggestionComposer();
  }

  registerSuggestionsChangedCallback(callback) { this.suggestionsChangeCallbacks.push(callback); }
  registerVisibleSuggestionsChangedCallback(callback) { this.visibleSuggestionsChangeCallbacks.push(callback); }

  setSuggestFilter(showAll, search) {
    assert(!showAll || !search);
    if (this.suggestFilter['showAll'] === showAll && this.suggestFilter['search'] === search) {
      return;
    }
    const previousSuggestions = this.getCurrentSuggestions();
    this.suggestFilter = {showAll, search};
    this._onMaybeSuggestionsChanged(previousSuggestions);
  }

  async loadSuggestions() {
    assert(this.store['get'], 'Unsupported getter in suggestion storage');
    const value = await this.store['get']() || {};
    if (!value.suggestions) {
      return;
    }

    const previousSuggestions = this.getCurrentSuggestions();
    if (await this.result.deserialize(value)) {
      this._onSuggestionsChanged();
      this._onMaybeSuggestionsChanged(previousSuggestions);

      if (this.result.generations && DevtoolsConnection.isConnected) {
        StrategyExplorerAdapter.processGenerations(this.result.generations, DevtoolsConnection.get());
      }
    }
  }

  getCurrentSuggestions(): Suggestion[] {
    const suggestions = this.result.suggestions.filter(
        suggestion => suggestion.plan.slots.length > 0);

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
    this.store.off('change', this.storeCallback);
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];
    if (this.suggestionComposer) {
      this.suggestionComposer.clear();
    }
  }

  _onSuggestionsChanged() {
    this.suggestionsChangeCallbacks.forEach(callback => callback({suggestions: this.result.suggestions}));
  }

  _onMaybeSuggestionsChanged(previousSuggestions) {
    const suggestions = this.getCurrentSuggestions();
    if (!PlanningResult.isEquivalent(previousSuggestions, suggestions)) {
      this.visibleSuggestionsChangeCallbacks.forEach(callback => callback(suggestions));
    }
  }

  _initSuggestionComposer() {
    const composer = this.arc.pec.slotComposer;
    if (composer && composer.findContextById('rootslotid-suggestions')) {
      this.suggestionComposer = new SuggestionComposer(composer);
      this.registerVisibleSuggestionsChangedCallback(
          (suggestions) => this.suggestionComposer.setSuggestions(suggestions));
    }
  }
}
