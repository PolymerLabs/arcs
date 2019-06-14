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
import {ArcDevtoolsChannel} from '../../devtools-connector/abstract-devtools-channel.js';
import {DevtoolsConnection} from '../../devtools-connector/devtools-connection.js';
import {Modality} from '../../runtime/modality.js';
import {PlanningExplorerAdapter} from '../debug/planning-explorer-adapter.js';
import {StrategyExplorerAdapter} from '../debug/strategy-explorer-adapter.js';
import {SuggestionComposer} from '../suggestion-composer.js';

import {PlanningResult} from './planning-result.js';
import {Suggestion, SuggestionVisibilityOptions} from './suggestion.js';
import {SuggestFilter} from './suggest-filter.js';

type Callback = ({}) => void;

export type VisibilityOptions = {reasons?: Map<string, SuggestionVisibilityOptions>};

export class PlanConsumer {
  arc: Arc;
  result: PlanningResult;
  suggestFilter = new SuggestFilter(false);
  // Callback is triggered when planning results have changed.
  private suggestionsChangeCallbacks: Callback[] = [];
  // Callback is triggered when suggestions visible to the user have changed.
  private visibleSuggestionsChangeCallbacks: Callback[] = [];
  suggestionComposer: SuggestionComposer|null = null;
  currentSuggestions: Suggestion[] = [];
  devtoolsChannel?: ArcDevtoolsChannel;

  constructor(arc: Arc, result: PlanningResult) {
    assert(arc, 'arc cannot be null');
    assert(result, 'result cannot be null');
    this.arc = arc;
    this.result = result;
    this.suggestionsChangeCallbacks = [];
    this.visibleSuggestionsChangeCallbacks = [];

    this._initSuggestionComposer();

    this.result.registerChangeCallback(() => this.onSuggestionsChanged());

    if (DevtoolsConnection.isConnected) {
      this.devtoolsChannel = DevtoolsConnection.get().forArc(this.arc);
    }
    this._maybeUpdateStrategyExplorer();
  }

  registerSuggestionsChangedCallback(callback) { this.suggestionsChangeCallbacks.push(callback); }
  registerVisibleSuggestionsChangedCallback(callback) { this.visibleSuggestionsChangeCallbacks.push(callback); }

  setSuggestFilter(showAll: boolean, search?: string) {
    assert(!showAll || !search);
    if (this.suggestFilter.isEquivalent(showAll, search)) {
      return;
    }
    this.suggestFilter = new SuggestFilter(showAll, search);
    this._onMaybeSuggestionsChanged();
  }

  onSuggestionsChanged() {
    this._onSuggestionsChanged();
    this._onMaybeSuggestionsChanged();
    this._maybeUpdateStrategyExplorer();
  }

  getCurrentSuggestions(options?: VisibilityOptions): Suggestion[] {
    return this.result.suggestions.filter(suggestion => {
      const suggestOption: SuggestionVisibilityOptions|undefined = options && options.reasons ? {reasons: []} : undefined;
      const isVisible = suggestion.isVisible(this.arc, this.suggestFilter, suggestOption);
      if (!isVisible && suggestOption && options) {
        options.reasons.set(suggestion.hash, suggestOption);
      }
      return isVisible;
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
    PlanningExplorerAdapter.updatePlanningResults(this.result, {}, this.devtoolsChannel);
  }

  _onMaybeSuggestionsChanged() {
    const options: VisibilityOptions|undefined = this.devtoolsChannel ? {reasons: new Map<string, SuggestionVisibilityOptions>()} : undefined;
    const suggestions = this.getCurrentSuggestions(options);
    if (!PlanningResult.isEquivalent(this.currentSuggestions, suggestions)) {
      this.visibleSuggestionsChangeCallbacks.forEach(callback => callback(suggestions));
      this.currentSuggestions = suggestions;
      PlanningExplorerAdapter.updateVisibleSuggestions(
          this.currentSuggestions, options, this.devtoolsChannel);
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

  _maybeUpdateStrategyExplorer() {
    if (this.result.generations.length) {
      StrategyExplorerAdapter.processGenerations(
          this.result.generations, this.devtoolsChannel, {label: 'Plan Consumer', keep: true});
    }
  }
}
