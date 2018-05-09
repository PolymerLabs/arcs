/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {Affordance} from './affordance.js';

export class SuggestionComposer {
  constructor(slotComposer) {
    assert(slotComposer);
    this._affordance = Affordance.forName(slotComposer.affordance);
    // TODO(mmandlis): find a cleaner way to fetch suggestions context.
    this._context = slotComposer._contextSlots.find(slot => slot.name == 'suggestions').context;
    assert(this._context);

    this._suggestions = [];
    this._suggestionsQueue = [];
    this._updateComplete = null;
  }

  async setSuggestions(suggestions) {
    this._suggestionsQueue.push(suggestions);
    Promise.resolve().then(async () => {
      if (this._updateComplete) {
        await this._updateComplete;
      }
      if (this._suggestionsQueue.length > 0) {
        this._suggestions = this._suggestionsQueue.pop();
        this._suggestionsQueue = [];
        this._updateComplete = this._updateSuggestions(this._suggestions);
      }
    });
  }

  async _updateSuggestions(suggestions) {
    this._affordance.contextClass.clear(this._context);
    return Promise.all(suggestions.map(async suggestion => {
      let suggestionContent =
        await suggestion.description.getRecipeSuggestion(this._affordance.descriptionFormatter);
      assert(suggestionContent, 'No suggestion content available');
      this._affordance.contextClass.createContext(
          this.createSuggestionElement(this._context, suggestion), suggestionContent);
    }));
  }

  createSuggestionElement(container, plan) {
    let suggest = Object.assign(document.createElement('suggestion-element'), {plan});
    // TODO(sjmiles): LIFO is weird, iterate top-down elsewhere?
    container.insertBefore(suggest, container.firstElementChild);
    return suggest;
  }
}
