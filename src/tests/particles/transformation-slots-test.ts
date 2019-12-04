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
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {StubLoader} from '../../runtime/testing/stub-loader.js';
import {StrategyTestHelper} from '../../planning/testing/strategy-test-helper.js';

describe('transformation slots', () => {
  it('combines hosted particles provided singleton slots into transformation provided set slot', async () => {
    const loader = new StubLoader({});
    const context = await Manifest.load(
        './src/tests/particles/artifacts/provide-hosted-particle-slots.manifest', loader);
    const runtime = new Runtime(loader, MockSlotComposer, context);
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const slotComposer = arc.pec.slotComposer as MockSlotComposer;

    slotComposer
      .newExpectations()
        .expectRenderSlot('FooList', 'root', {contentTypes: ['template', 'model']})
        .expectRenderSlot('ShowFoo', 'item', {contentTypes: ['template']})
        .expectRenderSlot('ShowFoo', 'item', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('Fooxer', 'item', {contentTypes: ['template']})
        .expectRenderSlot('Fooxer', 'item', {verify: (content) => {
          return content.model && content.model.items && content.model.items.length === 2;
        }})
        .expectRenderSlot('ShowFooAnnotation', 'annotation', {contentTypes: ['template']})
        .expectRenderSlot('ShowFooAnnotation', 'annotation', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('FooAnnotationMuxer', 'annotation', {contentTypes: ['template']})
        .expectRenderSlot('FooAnnotationMuxer', 'annotation', {verify: (content) => {
          return content.model && content.model.items && content.model.items.length === 2;
        }});

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);
    await suggestions[0].instantiate(arc);
    await arc.idle;
  });
});
