/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../platform/chai-web.js';
import {Recipe} from '../../../runtime/recipe/recipe.js';
import {Search} from '../../../runtime/recipe/search.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Relevance} from '../../../runtime/relevance.js';
import {Runtime} from '../../../runtime/runtime.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {RamDiskStorageDriverProvider} from '../../../runtime/storage/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../../runtime/testing/test-volatile-memory-provider.js';
import {storageKeyPrefixForTest} from '../../../runtime/testing/handle-for-test.js';
import {Loader} from '../../../platform/loader.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

describe('planning result', () => {
  let memoryProvider;
  beforeEach(() => {
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });

  async function testResultSerialization(manifestFilename) {
    const loader = new Loader();
    const context = await Manifest.load(manifestFilename, loader, {memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const suggestions = await StrategyTestHelper.planForArc(arc);

    assert.isNotEmpty(suggestions);
    const result = new PlanningResult({context, loader});
    result.merge({suggestions}, arc);

    const serialization = result.toLiteral();
    assert(serialization.suggestions);
    const resultNew = new PlanningResult({context, loader});
    assert.isEmpty(resultNew.suggestions);
    await resultNew.fromLiteral({suggestions: serialization.suggestions});
    assert.isTrue(resultNew.isEquivalent(suggestions));
  }
  it('serializes and deserializes Products recipes', async () => {
    await testResultSerialization('./src/runtime/tests/artifacts/Products/Products.recipes');
  });

  it('appends search suggestions', async () => {
    const loader = new Loader();
    const context = await Manifest.load('./src/runtime/tests/artifacts/Products/Products.recipes', loader, {memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const suggestions = await StrategyTestHelper.planForArc(arc);

    const result = new PlanningResult({loader, context});
    // Appends new suggestion.
    assert.isTrue(result.merge({suggestions}, arc));
    assert.lengthOf(result.suggestions, 1);

    // Tries to append already existing suggestions.
    assert.isFalse(result.merge({suggestions}, arc));
    assert.lengthOf(result.suggestions, 1);

    // Init results.
    const otherSuggestion = new Suggestion(suggestions[0].plan, 'other-hash', 0, suggestions[0].versionByStore);
    otherSuggestion.descriptionByModality['text'] = 'other description';
    suggestions.push(otherSuggestion);
    assert.isTrue(result.merge({suggestions}, arc));
    assert.lengthOf(result.suggestions, 2);

    const suggestionWithSearch = new Suggestion(otherSuggestion.plan, 'other-hash', 0, otherSuggestion.versionByStore);
    suggestionWithSearch.descriptionByModality['text'] = otherSuggestion.descriptionText;
    suggestionWithSearch.setSearch(new Search('hello world', /* unresolvedTokens= */[]));
    suggestions.push(suggestionWithSearch);
    assert.isTrue(result.merge({suggestions}, arc));
    assert.lengthOf(result.suggestions, 2);
    assert.deepEqual(result.suggestions[1].searchGroups, [[''], ['hello', 'world']]);
  });
});

describe('planning result merge', () => {
  let memoryProvider;
  beforeEach(() => {
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });

  const commonManifestStr = `
schema Thing
  foo: Text
resource ThingJson
  start
  [{"foo": "bar"}]
store ThingStore of Thing 'thing-id-0' in ThingJson
particle P1
  thing: writes Thing
particle P2
  thing: reads Thing
    `;
  const recipeOneStr = `
recipe R1
  thingHandle: create *
  P1
    thing: writes thingHandle
    `;
  const recipeTwoStr = `
recipe R2
  thingHandle: map 'thing-id-0'
  P2
    thing: reads thingHandle
      `;
  const recipeThreeStr = `
recipe R3
  thingHandle: copy 'thing-id-0'
  P1
    thing: writes thingHandle
  P2
    thing: reads thingHandle
        `;
  async function prepareMerge(manifestStr1, manifestStr2) {
    const loader = new Loader();
    const runtime = new Runtime({loader});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const planToSuggestion = async (plan: Recipe): Promise<Suggestion> => {
      const suggestion = Suggestion.create(plan, await plan.digest(), Relevance.create(arc, plan));
      suggestion.descriptionByModality['text'] = plan.name;
      for (const handle of plan.handles) {
        if (handle.id) {
          suggestion.versionByStore[handle.id] = 0;
        }
      }
      return suggestion;
    };
    const manifestToResult = async (manifestStr) =>  {
      const manifest = await Manifest.parse(manifestStr, {loader, fileName: '', memoryProvider});
      const result = new PlanningResult({context: arc.context, loader});

      const suggestions: Suggestion[] = await Promise.all(
          manifest.recipes.map(async plan => await planToSuggestion(plan)) as Promise<Suggestion>[]
      );
      result.merge({suggestions}, arc);
      return result;
    };
    return {
      arc,
      result1: await manifestToResult(manifestStr1),
      result2: await manifestToResult(manifestStr2)
    };
  }

  it('merges suggestions unchanged', async () => {
    // merging equivalent suggestions.
    const {arc, result1, result2} = await prepareMerge(
        `${commonManifestStr}${recipeOneStr}${recipeTwoStr}`,
        `${commonManifestStr}${recipeOneStr}${recipeTwoStr}`);
    assert.lengthOf(result1.suggestions, 2);
    assert.isFalse(result1.merge({suggestions: result2.suggestions}, arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R2']);

    // merging empty suggestions into existing ones.
    assert.isFalse(result1.merge({suggestions: []}, arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R2']);
  });

  it('merges suggestions union', async () => {
    const {arc, result1, result2} = await prepareMerge(
        `${commonManifestStr}${recipeOneStr}${recipeTwoStr}`,
        `${commonManifestStr}${recipeTwoStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 2);
    assert.lengthOf(result2.suggestions, 2);
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, arc));
    assert.lengthOf(result1.suggestions, 3);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R2', 'R3']);
  });

  it('merges suggestions union with outdated suggestions', async () => {
    const recipeFourStr = `
recipe R4
  thing1Handle: create *
  thing2Handle: create *
  P1
    thing: writes thing1Handle
  P1
    thing: writes thing1Handle
    `;
    const {arc, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeOneStr}${recipeTwoStr}${recipeThreeStr}`,
      `${commonManifestStr}${recipeThreeStr}${recipeFourStr}`);
    assert.lengthOf(result1.suggestions, 3);
    assert.lengthOf(result2.suggestions, 2);
    // All recipes using store 'thing-id-0' are outdated
    arc.getVersionByStore = () =>  ({'thing-id-0': 1});
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.deepEqual(result1.suggestions.map(s => s.descriptionText), ['R1', 'R4']);
  });

  it('merges all outdated suggestions', async () => {
    const {arc, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeTwoStr}`,
      `${commonManifestStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 1);
    assert.lengthOf(result2.suggestions, 1);
    // All recipes using store 'thing-id-0' are outdated
    arc.getVersionByStore = () =>  ({'thing-id-0': 1});
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, arc));
    assert.isEmpty(result1.suggestions);
  });

  it('merges same suggestion with newer store versions', async () => {
    const {arc, result1, result2} = await prepareMerge(
      `${commonManifestStr}${recipeTwoStr}`,
      `${commonManifestStr}${recipeTwoStr}${recipeThreeStr}`);
    assert.lengthOf(result1.suggestions, 1);
    assert.lengthOf(result2.suggestions, 2);

    // Increment store 'thing-id-0' version in result1.
    result2.suggestions[0].versionByStore['thing-id-0'] = 1;
    assert.isTrue(result1.merge({suggestions: result2.suggestions}, arc));
    assert.lengthOf(result1.suggestions, 2);
    assert.strictEqual(result1.suggestions[0].versionByStore['thing-id-0'], 1);
  });
});
