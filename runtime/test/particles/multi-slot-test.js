/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {assert} from '../chai-web.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('multi-slot test', function() {
  async function init() {
    return await TestHelper.loadManifestAndPlan(
      './runtime/test/particles/artifacts/multi-slot-test.manifest', {
        expectedNumPlans: 4,
        expectedSuggestions: ['Show question.', 'Show answer.', 'Show question and answer.', 'Show question and hints.']
    });
  }

  let verifyHandler = (expectedSlotNames, particleName, slotName, content) => {
    assert.isTrue(expectedSlotNames.includes(slotName), `Unexpected slot ${slotName}`);
 
    assert.isTrue(content.template.includes(`{{${slotName}}}`));
    let exclude = slotName == 'question' ? 'answer' : 'question';
    assert.isFalse(content.template.includes(`{{${exclude}}}`));
    assert(content.model[slotName]);
    assert(!content.model[exclude]);
  };

  it('can render question slot', async () => {
    let helper = await init();
    helper.slotComposer
        .newExpectations()
        .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']});
    await helper.acceptSuggestion({descriptionText: 'Show question.'});

    helper.verifySlots(1, verifyHandler.bind(null, ['question']));
  });

  it('can render question and answer slots', async () => {
    let helper = await init();
    helper.slotComposer
        .newExpectations()
        .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']})
        .expectRenderSlot('AskAndAnswer', 'answer', {contentTypes: ['template', 'model']});
    await helper.acceptSuggestion({descriptionText: 'Show question and answer.'});

    helper.verifySlots(2, verifyHandler.bind(null, ['question', 'answer']));
  });

  it('can render multi set slot', async () => {
    let helper = await init();

    helper.slotComposer
      .newExpectations()
      .expectRenderSlot('ShowHints', 'root', {verify: (content) => content.template.length > 0 && !content.model})
      .expectRenderSlot('ShowHints', 'root', {isOptional: true, verify: (content) => Object.keys(content).length == 0})
      .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']})
      .expectRenderSlot('AskAndAnswer', 'hints', {contentTypes: ['template', 'model'], verify: (content) => {
        assert.deepEqual(['A', 'B', 'C', 'D', 'E'], Object.keys(content.template));
        return true;
      }});

    await helper.acceptSuggestion({descriptionText: 'Show question and hints.'});
  });
});
