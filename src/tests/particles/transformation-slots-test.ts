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
import {SlotTestObserver} from '../../runtime/testing/slot-test-observer.js';
import {Loader} from '../../platform/loader.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';
import {StrategyTestHelper} from '../../planning/testing/strategy-test-helper.js';
import {RamDiskStorageDriverProvider} from '../../runtime/storage/drivers/ramdisk.js';

describe('transformation slots', () => {
  it('combines hosted particles provided singleton slots into transformation provided set slot', async () => {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const context = await Manifest.load(
        './src/tests/particles/artifacts/provide-hosted-particle-slots.manifest', loader, {memoryProvider});
    const runtime = new Runtime({
        loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const slotComposer = arc.peh.slotComposer;

    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);

    observer
      .newExpectations()
        .expectRenderSlot('FooList', 'root')
        .expectRenderSlot('ShowFoo', 'item')
        .expectRenderSlot('ShowFoo', 'item', {times: 2})
        .expectRenderSlot('Fooxer', 'item')
        .expectRenderSlot('ShowFooAnnotation', 'annotation')
        .expectRenderSlot('ShowFooAnnotation', 'annotation', {times: 2})
        ;

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);
    await suggestions[0].instantiate(arc);
    await arc.idle;
  });
});
