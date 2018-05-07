/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {SuggestionComposer} from '../suggestion-composer.js';

class TestSuggestionComposer extends SuggestionComposer {
  constructor() {
    super({affordance: 'mock', _contextSlots: [{name: 'suggestions', context: {}}]});
    this.suggestions = [];
    this.updatesCount = 0;
    this.updateResolve = null;
  }

  async _updateSuggestions(suggestions) {
    ++this.updatesCount;
    return new Promise((resolve, reject) => this.updateResolve = resolve).then(() => this.suggestions = suggestions);
  }

  async updateDone() {
    this.updateResolve();
    return this._updateComplete;
  }
}

describe('suggestion composer', function() {
  it('sets suggestions', async () => {
    let suggestionComposer = new TestSuggestionComposer();
    assert.lengthOf(suggestionComposer.suggestions, 0);

    // Sets suggestions
    await suggestionComposer.setSuggestions([1, 2, 3]);
    assert.equal(1, suggestionComposer.updatesCount);
    assert.lengthOf(suggestionComposer.suggestions, 0);
    await suggestionComposer.updateDone();
    assert.equal(1, suggestionComposer.updatesCount);
    assert.lengthOf(suggestionComposer.suggestions, 3);

    // Sets suggestions several times, only the latest update goes through.
    await suggestionComposer.setSuggestions([4]);
    await suggestionComposer.setSuggestions([5, 6]);
    await suggestionComposer.updateDone();
    assert.equal(2, suggestionComposer.updatesCount);
    assert.lengthOf(suggestionComposer.suggestions, 2);

    await suggestionComposer.setSuggestions([7]);
    await suggestionComposer.setSuggestions([8]);
    await suggestionComposer.setSuggestions([9, 10, 11]);
    await suggestionComposer.setSuggestions([]);
    await suggestionComposer.updateDone();
    await suggestionComposer.updateDone();
    assert.equal(4, suggestionComposer.updatesCount);
    assert.lengthOf(suggestionComposer.suggestions, 0);
  });
});
