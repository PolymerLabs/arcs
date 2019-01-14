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
import {Recipe} from '../../recipe/recipe.js';
import {Relevance} from '../../relevance.js';
import {Search} from '../../recipe/search.js';
import {Suggestion} from '../../plan/suggestion.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('planning result', () => {
  async function testResultSerialization(manifestFilename) {
    const helper = await TestHelper.createAndPlan({manifestFilename});
    assert.isNotEmpty(helper.suggestions);
    helper.suggestions.forEach(s => {
      s.relevance = Relevance.create(helper.arc, s.plan);
      s.relevance.apply(new Map([[s.plan.particles[0], [1]]]));
    });
    const result = new PlanningResult(helper.envOptions);
    result.set({suggestions: helper.suggestions});

    const serialization = result.toLiteral();
    assert(serialization.suggestions);
    const resultNew = new PlanningResult(helper.envOptions);
    assert.isEmpty(resultNew.suggestions);
    await resultNew.fromLiteral({suggestions: serialization.suggestions});
    assert.isTrue(resultNew.isEquivalent(helper.suggestions));
  }
  it('serializes and deserializes Products recipes', async () => {
    await testResultSerialization('./src/runtime/test/artifacts/Products/Products.recipes');
  });

  it('appends search suggestions', async () => {
    const helper = await TestHelper.createAndPlan(
        {manifestFilename: './src/runtime/test/artifacts/Products/Products.recipes'});
    const result = new PlanningResult(helper.envOptions);
    // Appends new suggestion.
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 1);

    // Tries to append already existing suggestions.
    assert.isFalse(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 1);

    // init results.
    const otherSuggestion = new Suggestion(helper.suggestions[0].plan, 'other-hash', 0, helper.arc);
    otherSuggestion.descriptionByModality['text'] = 'other description';
    helper.suggestions.push(otherSuggestion);
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 2);

    const suggestionWithSearch = new Suggestion(otherSuggestion.plan, 'other-hash', 0, helper.arc);
    suggestionWithSearch.descriptionByModality['text'] = otherSuggestion.descriptionText;
    suggestionWithSearch.setSearch(new Search('hello world', /* unresolvedTokens= */[]));
    helper.suggestions.push(suggestionWithSearch);
    assert.isTrue(result.append({suggestions: helper.suggestions}));
    assert.lengthOf(result.suggestions, 2);
    assert.deepEqual(result.suggestions[1].searchGroups, [[''], ['hello', 'world']]);
  });
});

describe('planning result merge', () => {
  const commonManifestStr = `
schema Thing
  Text foo
resource ThingJson
  start
  [{"foo": "bar"}]
store ThingStore of Thing 'thing-id-0' in ThingJson
particle P1
  out Thing thing
particle P2
  in Thing thing
    `;
  const recipeOneStr = `
recipe R1
  create as thingHandle
  P1
    thing -> thingHandle
    `;
  const recipeTwoStr = `
recipe R2
  map 'thing-id-0' as thingHandle
  P2
    thing <- thingHandle
      `;
  const recipeThreeStr = `
recipe R3
  copy 'thing-id-0' as thingHandle
  P1
    thing -> thingHandle
  P2
    thing <- thingHandle
        `;
  async function prepareMerge(manifestStr1, manifestStr2) {
    const helper = await TestHelper.create();

    const planToSuggestion = async (plan: Recipe): Promise<Suggestion> => {
      const suggestion = Suggestion.create(plan, await plan.digest(), Relevance.create(helper.arc, plan));
      suggestion.descriptionByModality['text'] = plan.name;
      for (const handle of plan.handles) {
        if (handle.id) {
          suggestion.versionByStore[handle.id] = 0;
        }
      }
      return suggestion;
    };
    const manifestToResult = async (manifestStr) =>  {
      const manifest = await TestHelper.parseManifest(manifestStr, helper.loader);
      const result = new PlanningResult(helper.envOptions);

      const suggestions: Suggestion[] = await Promise.all(
          manifest.recipes.map(async plan => await planToSuggestion(plan)) as Promise<Suggestion>[]
      );
      result.set({suggestions});
      return result;
    };
    return {
      helper,
      result1: await manifestToResult(manifestStr1),
      result2: await manifestToResult(manifestStr2)
    };
  }

  it('merges suggestions unchanged', async () => {
    // merging equivalent suggestions.
    const {helper, result1, result2} = await prepareMerge(
        `${commonManifestStr}${recipeOneStr}${recipeTwoStr}`,
        `${commonManifestStr}${recipeOneStr}${recipeTwoStr}`);
    assert.lengthOf(result1.suggestions, 2);
    assert.isFalse(result1.merge({suggestions: result2.suggestions}, helper.arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R2']);

    // merging empty suggestions into existing ones.
    assert.isFalse(result1.merge({suggestions: []}, helper.arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R2']);
  });

  it('merges suggestions union', async () => {
    const {helper, result1, result2} = await prepareMerge(
        `${commonManifestStr}${recipeOneStr}${recipeTwoStr}`,
        `${commonManifestStr}${recipeTwoStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 2);
    assert.lengthOf(result2.suggestions, 2);
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, helper.arc));
    assert.lengthOf(result1.suggestions, 3);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R2', 'R3']);
  });

  it('merges suggestions union with outdated suggestions', async () => {
    const recipeFourStr = `
recipe R4
  create as thing1Handle
  create as thing2Handle
  P1
    thing -> thing1Handle
  P1
    thing -> thing1Handle
    `;
    const {helper, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeOneStr}${recipeTwoStr}${recipeThreeStr}`,
      `${commonManifestStr}${recipeThreeStr}${recipeFourStr}`);
    assert.lengthOf(result1.suggestions, 3);
    assert.lengthOf(result2.suggestions, 2);
    // All recipes using store 'thing-id-0' are outdated
    helper.arc.getVersionByStore = () =>  ({'thing-id-0': 1});
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, helper.arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R4']);
  });

  it('merges all outdated suggestions', async () => {
    const {helper, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeTwoStr}`,
      `${commonManifestStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 1);
    assert.lengthOf(result2.suggestions, 1);
    // All recipes using store 'thing-id-0' are outdated
    helper.arc.getVersionByStore = () =>  ({'thing-id-0': 1});
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, helper.arc));
    assert.isEmpty(result1.suggestions);
  });
  it('merges same suggestion with older store versions', async () => {
    const {helper, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeTwoStr}`,
      `${commonManifestStr}${recipeTwoStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 1);
    assert.lengthOf(result2.suggestions, 2);

    // Increment store 'thing-id-0' version in result1.
    result1.suggestions[0].versionByStore['thing-id-0'] = 1;
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, helper.arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.equal(result1.suggestions[0].versionByStore['thing-id-0'], 1);
  });
  it('merges same suggestion with newer store versions', async () => {
    const {helper, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeTwoStr}`,
      `${commonManifestStr}${recipeTwoStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 1);
    assert.lengthOf(result2.suggestions, 2);

    // Increment store 'thing-id-0' version in result1.
    result2.suggestions[0].versionByStore["thing-id-0"] = 1;
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, helper.arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.equal(result1.suggestions[0].versionByStore['thing-id-0'], 1);
  });
});
