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
import {PlanningResult} from '../../plan/planning-result.js';
import {Relevance} from '../../relevance.js';
import {Search} from '../../recipe/search.js';
import {Suggestion} from '../../plan/suggestion.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('planning result', function() {
  async function testResultSerialization(manifestFilename) {
    const helper = await TestHelper.createAndPlan({manifestFilename});
    assert.isNotEmpty(helper.suggestions);
    helper.suggestions.forEach(s => {
      s.relevance = Relevance.create(helper.arc, s.plan);
      s.relevance.apply(new Map([[s.plan.particles[0], [1]]]));
    });
    const result = new PlanningResult();
    result.set({suggestions: helper.suggestions});

    const serialization = result.toLiteral();
    assert(serialization.suggestions);
    const resultNew = new PlanningResult();
    assert.isEmpty(resultNew.suggestions);
    resultNew.fromLiteral({suggestions: serialization.suggestions});
    assert.isTrue(resultNew.isEquivalent(helper.suggestions));
  }
  it('serializes and deserializes Products recipes', async () => {
    await testResultSerialization('./src/runtime/test/artifacts/Products/Products.recipes');
  });

  it('appends search suggestions', async () => {
    const helper = await TestHelper.createAndPlan(
        {manifestFilename: './src/runtime/test/artifacts/Products/Products.recipes'});
    const result = new PlanningResult();
    // Appends new suggestion.
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 1);

    // Tries to append already existing suggestions.
    assert.isFalse(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 1);

    // init results.
    const relevance = Relevance.create(helper.arc, helper.suggestions[0].plan);
    const otherSuggestion = new Suggestion(helper.suggestions[0].plan, 'other-hash', relevance, helper.arc);
    otherSuggestion.descriptionByModality['text'] = 'other description';
    helper.suggestions.push(otherSuggestion);
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 2);

    const suggestionWithSearch = new Suggestion(otherSuggestion.plan, 'other-hash', relevance, otherSuggestion.arc);
    suggestionWithSearch.descriptionByModality['text'] = otherSuggestion.descriptionText;
    suggestionWithSearch.setSearch(new Search('hello world', /* unresolvedTokens= */[]));
    helper.suggestions.push(suggestionWithSearch);
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 2);
    assert.deepEqual(result.suggestions[1].searchGroups, [[''], ['hello', 'world']]);
  });

  // TODO: add more tests.
});
