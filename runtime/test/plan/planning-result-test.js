/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import {PlanningResult} from '../../ts-build/plan/planning-result.js';
import {Search} from '../../ts-build/recipe/search.js';
import {Suggestion} from '../../ts-build/plan/suggestion.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('planning result', function() {
  async function testResultSerialization(manifestFilename) {
    const helper = await TestHelper.createAndPlan({manifestFilename});
    assert.isNotEmpty(helper.suggestions);
    const result = new PlanningResult(helper.arc, {suggestions: helper.suggestions});

    const serialization = result.serialize();
    assert(serialization.suggestions);
    const resultNew = new PlanningResult(helper.arc);
    assert.isEmpty(resultNew.suggestions);
    await resultNew.deserialize({suggestions: serialization.suggestions});
    assert.isTrue(resultNew.isEquivalent(helper.suggestions));
  }
  it('serializes and deserializes Products recipes', async () => {
    await testResultSerialization('./runtime/test/artifacts/Products/Products.recipes');
  });

  it('appends search suggestions', async () => {
    const helper = await TestHelper.createAndPlan(
        {manifestFilename: './runtime/test/artifacts/Products/Products.recipes'});
    const result = new PlanningResult(helper.arc);
    // Appends new suggestion.
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 1);

    // Tries to append already existing suggestions.
    assert.isFalse(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 1);

    // init results.
    const otherSuggestion = new Suggestion(helper.suggestions[0], 'other-hash', 0, helper.arc);
    otherSuggestion.descriptionText = 'other description';
    helper.suggestions.push(otherSuggestion);
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 2);

    const suggestionWithSearch = new Suggestion(otherSuggestion.plan, 'other-hash', 0, otherSuggestion.arc);
    suggestionWithSearch.descriptionText = otherSuggestion.descriptionText;
    suggestionWithSearch.setSearch(new Search('hello world', /* unresolvedTokens= */[]));
    helper.suggestions.push(suggestionWithSearch);
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 2);
    assert.deepEqual(result.suggestions[1].searchGroups, [[''], ['hello', 'world']]);
  });

  // TODO: add more tests.
});
