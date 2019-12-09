/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Suggestion} from '../../planning/plan/suggestion.js';
import {StrategyTestHelper} from '../../planning/testing/strategy-test-helper.js';
import {HeadlessSlotDomConsumer} from '../../runtime/headless-slot-dom-consumer.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {checkNotNull} from '../../runtime/testing/preconditions.js';
import {StubLoader} from '../../runtime/testing/stub-loader.js';

describe('multi-slot test', () => {
  async function init() {
    const loader = new StubLoader({});
    const context = await Manifest.load(
        './src/tests/particles/artifacts/multi-slot-test.manifest', loader);
    const runtime = new Runtime(loader, MockSlotComposer, context);
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const slotComposer = arc.pec.slotComposer as MockSlotComposer;
    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 4);
    assert.deepEqual(
      suggestions.map(s => s.descriptionText).sort(),
      ['Show question.', 'Show answer.', 'Show question and answer.', 'Show question and hints.'].sort()
    );

    return {suggestions, arc, slotComposer};
  }

  function findSuggestionByDescription(suggestions: Suggestion[], descriptionText: string): Suggestion {
    return checkNotNull(suggestions.find(s => s.descriptionText === descriptionText));
  }

  const verifySlots = (slotComposer: MockSlotComposer, numConsumers: number, expectedSlotNames) => {
    assert.lengthOf(slotComposer.consumers, numConsumers);
    for (const consumer of slotComposer.consumers as HeadlessSlotDomConsumer[]) {
      const slotName = consumer.consumeConn.name;
      const content = consumer._content;

      assert.isTrue(expectedSlotNames.includes(slotName), `Unexpected slot ${slotName}`);
      assert.isTrue(content.template.includes(`{{${slotName}}}`));
      const exclude = slotName === 'question' ? 'answer' : 'question';
      assert.isFalse(content.template.includes(`{{${exclude}}}`));
      assert(content.model[slotName]);
      assert(!content.model[exclude]);
    }
  };

  it('can render question slot', async () => {
    const {suggestions, arc, slotComposer} = await init();
    slotComposer
        .newExpectations()
        .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']});
    await findSuggestionByDescription(suggestions, 'Show question.').instantiate(arc);
    await arc.idle;

    verifySlots(slotComposer, 1, ['question']);
  });

  it('can render question and answer slots', async () => {
    const {suggestions, arc, slotComposer} = await init();
    slotComposer
        .newExpectations()
        .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']})
        .expectRenderSlot('AskAndAnswer', 'answer', {contentTypes: ['template', 'model']});
    await findSuggestionByDescription(suggestions, 'Show question and answer.').instantiate(arc);
    await arc.idle;

    verifySlots(slotComposer, 2, ['question', 'answer']);
  });

  it('can render multi set slot', async () => {
    const {suggestions, arc, slotComposer} = await init();

    slotComposer
      .newExpectations()
      .expectRenderSlot('ShowHints', 'root', {verify: (content) => content.template.length > 0})
      .expectRenderSlot('ShowHints', 'root', {isOptional: true, verify: (content) => Object.keys(content).length === 0})
      .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']})
      .expectRenderSlot('AskAndAnswer', 'hints', {contentTypes: ['template', 'model'], verify: (content) => {
        assert.deepEqual(['defaultA', 'defaultB', 'defaultC', 'defaultD', 'defaultE'], Object.keys(content.template));
        return true;
      }});

    await findSuggestionByDescription(suggestions, 'Show question and hints.').instantiate(arc);
    await arc.idle;
  });
});
