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

import {TestHelper} from '../../testing/test-helper.js';

describe('transformation slots', function() {
  it('combines hosted particles provided singleton slots into transformation provided set slot', async () => {
    let helper = await TestHelper.loadManifestAndPlan(
      './runtime/test/particles/artifacts/provide-hosted-particle-slots.manifest', {expectedNumPlans: 1});

    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('FooList', 'root', {contentTypes: ['template', 'model']})
        .expectRenderSlot('ShowFoo', 'item', {contentTypes: ['template']})
        .expectRenderSlot('ShowFoo', 'item', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('Fooxer', 'item', {contentTypes: ['template']})
        .expectRenderSlot('Fooxer', 'item', {verify: (content) => {
          return content.model && content.model.items && content.model.items.length == 2;
        }})
        .expectRenderSlot('ShowFooAnnotation', 'annotation', {contentTypes: ['template']})
        .expectRenderSlot('ShowFooAnnotation', 'annotation', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('FooAnnotationMuxer', 'annotation', {contentTypes: ['template']})
        .expectRenderSlot('FooAnnotationMuxer', 'annotation', {verify: (content) => {
          return content.model && content.model.items && content.model.items.length == 2;
        }});

    await helper.acceptSuggestion();
  });
});
