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
import {Recipe} from '../recipe/recipe';
import {PlanningResult} from './planning-result';
import {StorageProviderBase} from '../storage/storage-provider-base';
import {SuggestionComposer} from '../../suggestion-composer.js';

type Callback = ({}) => void;

export class PlanConsumer {
  arc: Arc;
  result: PlanningResult;
  store: StorageProviderBase;
  suggestFilter: {};
  plansChangeCallbacks: Callback[] = [];
  suggestionsChangeCallbacks: Callback[] = [];
  storeCallback: Callback;
  suggestionComposer: SuggestionComposer|null = null;

  constructor(arc: Arc, store: StorageProviderBase) {
    assert(arc, 'arc cannot be null');
    assert(store, 'store cannot be null');
    this.arc = arc;
    this.result = new PlanningResult(arc);
    this.store = store;
    this.suggestFilter = {showAll: false};
    this.plansChangeCallbacks = [];
    this.suggestionsChangeCallbacks = [];

    this.storeCallback = () => this.loadPlans();
    this.store.on('change', this.storeCallback, this);

    this._initSuggestionComposer();
  }

  registerPlansChangedCallback(callback) { this.plansChangeCallbacks.push(callback); }
  registerSuggestChangedCallback(callback) { this.suggestionsChangeCallbacks.push(callback); }

  setSuggestFilter(showAll, search) {
    assert(!showAll || !search);
    if (this.suggestFilter['showAll'] === showAll && this.suggestFilter['search'] === search) {
      return;
    }
    const previousSuggestions = this.getCurrentSuggestions();
    this.suggestFilter = {showAll, search};
    this._onMaybeSuggestionsChanged(previousSuggestions);
  }

  async loadPlans() {
    assert(this.store['get'], 'Unsupported getter in suggestion storage');
    const value = await this.store['get']() || {};
    if (!value.plans) {
      return;
    }

    const previousSuggestions = this.getCurrentSuggestions();
    if (await this.result.deserialize(value)) {
      this._onPlansChanged();
      this._onMaybeSuggestionsChanged(previousSuggestions);
    }
  }

  getCurrentSuggestions() {
    const suggestions = this.result.plans.filter(
        suggestion => suggestion['plan'].slots.length > 0);

    // `showAll`: returns all plans that render into slots.
    if (this.suggestFilter['showAll']) {
      return suggestions;
    }

    // search filter non empty: match plan search phrase or description text.
    if (this.suggestFilter['search']) {
      return suggestions.filter(suggestion =>
        suggestion['descriptionText'].toLowerCase().includes(this.suggestFilter['search']) ||
        (suggestion['plan'].search &&
         suggestion['plan'].search.phrase.includes(this.suggestFilter['search'])));
    }

    return suggestions.filter(suggestion => {
      const usesHandlesFromActiveRecipe = suggestion['plan'].handles.find(handle => {
        // TODO(mmandlis): find a generic way to exlude system handles (eg Theme),
        // either by tagging or by exploring connection directions etc.
        return !!handle.id &&
               this.arc.activeRecipe.handles.find(activeHandle => activeHandle.id === handle.id);
      });
      const usesRemoteNonRootSlots = suggestion['plan'].slots.find(slot => {
        return !slot.name.includes('root') && !slot.tags.includes('root') &&
               slot.id && !slot.id.includes('root');
      });
      const onlyUsesNonRootSlots =
          !suggestion['plan'].slots.find(s => s.name.includes('root') || s.tags.includes('root'));
      return (usesHandlesFromActiveRecipe && usesRemoteNonRootSlots) || onlyUsesNonRootSlots;
    });
  }

  dispose() {
    this.store.off('change', this.storeCallback);
    this.plansChangeCallbacks = [];
    this.suggestionsChangeCallbacks = [];
    if (this.suggestionComposer) {
      this.suggestionComposer.clear();
    }
  }

  _onPlansChanged() {
    this.plansChangeCallbacks.forEach(callback => callback({plans: this.result.plans}));
  }

  _onMaybeSuggestionsChanged(previousSuggestions) {
    const suggestions = this.getCurrentSuggestions();
    if (!PlanningResult.isEquivalent(previousSuggestions, suggestions)) {
      this.suggestionsChangeCallbacks.forEach(callback => callback(suggestions));
    }
  }

  _initSuggestionComposer() {
    const composer = this.arc.pec.slotComposer;
    if (composer && composer.findContextById('rootslotid-suggestions')) {
      this.suggestionComposer = new SuggestionComposer(composer);
      this.registerSuggestChangedCallback(
          (suggestions) => this.suggestionComposer.setSuggestions(suggestions));
    }
  }
}
