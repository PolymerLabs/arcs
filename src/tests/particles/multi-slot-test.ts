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
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {SlotTestObserver} from '../../runtime/testing/slot-test-observer.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';
import {checkNotNull} from '../../runtime/testing/preconditions.js';
import {Loader} from '../../platform/loader.js';
import {RamDiskStorageDriverProvider} from '../../runtime/storageNG/drivers/ramdisk.js';

// TODO(sjmiles): multi-slot not supported atm: support was abandoned because there were no practical cases, only tests
// In particular, the tests artifacts used here rely on `Particle::currentSlotName`, which was removed.

// describe('multi-slot test', () => {
//   async function init() {
//     const loader = new Loader();

//     const memoryProvider = new TestVolatileMemoryProvider();
//     RamDiskStorageDriverProvider.register(memoryProvider);

//     const manifest = './src/tests/particles/artifacts/multi-slot-test.manifest';
//     const context = await Manifest.load(manifest, loader, {memoryProvider});

//     const runtime = new Runtime({loader, context, memoryProvider});
//     const arc = runtime.newArc('demo', storageKeyPrefixForTest());

//     const slotComposer = arc.peh.slotComposer;
//     const observer = new SlotTestObserver();
//     slotComposer.observeSlots(observer);

//     const suggestions = await StrategyTestHelper.planForArc(arc);
//     assert.lengthOf(suggestions, 4);
//     assert.deepEqual(
//       suggestions.map(s => s.descriptionText).sort(),
//       ['Show question.', 'Show answer.', 'Show question and answer.', 'Show question and hints.'].sort()
//     );

//     return {suggestions, arc, slotComposer, observer};
//   }

//   function findSuggestionByDescription(suggestions: Suggestion[], descriptionText: string): Suggestion {
//     return checkNotNull(suggestions.find(s => s.descriptionText === descriptionText));
//   }

//   it('can render question slot', async () => {
//     const {suggestions, arc, observer} = await init();
//     observer
//       .newExpectations()
//       .expectRenderSlot('AskAndAnswer', 'question')
//       ;
//     await findSuggestionByDescription(suggestions, 'Show question.').instantiate(arc);
//     console.log(arc.activeRecipe.toString());
//     await arc.idle;
//     await observer.expectationsCompleted();
//   });

//   it('can render question and answer slots', async () => {
//     const {suggestions, arc, observer} = await init();
//     observer
//       .newExpectations()
//       .expectRenderSlot('AskAndAnswer', 'question', {contentTypes: ['template', 'model']})
//       .expectRenderSlot('AskAndAnswer', 'answer', {contentTypes: ['template', 'model']})
//       ;
//     await findSuggestionByDescription(suggestions, 'Show question and answer.').instantiate(arc);
//     await arc.idle;
//     await observer.expectationsCompleted();
//   });

//   it('can render multi set slot', async () => {
//     const {suggestions, arc, observer} = await init();
//     observer
//       .newExpectations()
//       .expectRenderSlot('ShowHints', 'root')
//       .expectRenderSlot('ShowHints', 'root') //, {isOptional: true})
//       .expectRenderSlot('AskAndAnswer', 'question')
//       .expectRenderSlot('AskAndAnswer', 'hints')
//       ;
//     await findSuggestionByDescription(suggestions, 'Show question and hints.').instantiate(arc);
//     await arc.idle;
//     await observer.expectationsCompleted();
//   });
// });
