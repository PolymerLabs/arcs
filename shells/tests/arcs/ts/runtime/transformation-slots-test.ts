/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../../build/platform/chai-web.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../../../../build/runtime/testing/handle-for-test.js';
import {SlotTestObserver} from '../../../../../build/runtime/testing/slot-test-observer.js';
import {StrategyTestHelper} from '../../../../../build/planning/testing/strategy-test-helper.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

describe('transformation slots', () => {
  it('combines hosted particles provided singleton slots into transformation provided set slot', async () => {
    const runtime = new Runtime();
    runtime.context = await runtime.parseFile('./shells/tests/artifacts/provide-hosted-particle-slots.manifest');

    const slotObserver = new SlotTestObserver();
    const arc = runtime.newArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest(), slotObserver});

    slotObserver
      .newExpectations()
        .expectRenderSlot('FooList', 'root')
        .expectRenderSlot('ShowFoo', 'item')
        .expectRenderSlot('ShowFoo', 'item', {times: 2})
        .expectRenderSlot('Fooxer', 'item')
        .expectRenderSlot('ShowFooAnnotation', 'annotation')
        .expectRenderSlot('ShowFooAnnotation', 'annotation', {times: 2});

    const suggestions = await StrategyTestHelper.planForArc(runtime, arc);
    assert.lengthOf(suggestions, 1);
    // await suggestions[0].instantiate(arc);
    await runtime.allocator.runPlanInArc(arc.id, suggestions[0].plan);
    await arc.idle;
  });
});
