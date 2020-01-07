/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {ArcId} from '../id.js';
import {Arc} from '../arc.js';
//import {HeadlessSlotDomConsumer} from '../headless-slot-dom-consumer.js';
//import {HostedSlotContext, ProvidedSlotContext} from '../slot-context.js';
//import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {SlotTestObserver} from '../testing/slot-test-observer.js';
import {SlotComposer} from '../slot-composer.js';
import {Recipe} from '../recipe/recipe.js';
import {collectionHandleForTest} from '../testing/handle-for-test.js';
import {CollectionHandle} from '../storageNG/handle.js';
import {Entity} from '../entity.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';

describe('particle interface loading with slotsFOO', () => {
  async function initializeManifestAndArc(contextContainer?): Promise<{manifest: Manifest, recipe: Recipe, observer: SlotTestObserver, arc: Arc}> {
    const loader = new Loader();
    const manifest = `
      import './src/runtime/tests/artifacts/transformations/test-slots-particles.manifest'
      recipe
        handle0: create *
        slot0: slot 'rootslotid-set-slotid-0'
        MultiplexSlotsParticle
          particle0: SingleSlotParticle
          foos: reads handle0
          annotationsSet: consumes slot0
    `;
    const context = await Manifest.parse(manifest, {loader, fileName: '', memoryProvider: new TestVolatileMemoryProvider()});
    const recipe = context.recipes[0];

    const slotComposer = new SlotComposer();
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);

    const arc = new Arc({id: ArcId.newForTest('test'), slotComposer, context, loader});

    assert(recipe.normalize(), `can't normalize recipe`);
    assert(recipe.isResolved(), `recipe isn't resolved`);

    return {manifest: context, recipe, observer, arc};
  }

  // tslint:disable-next-line: no-any
  async function instantiateRecipeAndStore(arc: Arc, recipe: Recipe, manifest: Manifest): Promise<CollectionHandle<any>> {
    await arc.instantiate(recipe);
    const inStore = arc.findStoresByType(manifest.findTypeByName('Foo').collectionOf())[0];
    const inHandle = await collectionHandleForTest(arc, inStore);
    await inHandle.add(Entity.identify(new inHandle.entityClass({value: 'foo1'}), 'subid-1'));
    await inHandle.add(Entity.identify(new inHandle.entityClass({value: 'foo2'}), 'subid-2'));
    return inHandle;
  }

  //const expectedTemplateName = 'MultiplexSlotsParticle::annotationsSet::SingleSlotParticle::annotation::default';

  // function verifyFooItems(slotConsumer, expectedValues) {
  //   const renderings = slotConsumer.renderings.filter(([subId, {model}]) => Boolean(model));
  //   assert.strictEqual(renderings.length, Object.keys(expectedValues).length);
  //   for (const [subId, {model, templateName}] of renderings) {
  //     assert.strictEqual(expectedValues[subId], model.value);
  //     assert.strictEqual(expectedTemplateName, templateName);
  //     assert.isTrue(!!HeadlessSlotDomConsumer.hasTemplate(expectedTemplateName));
  //   }
  // }

  // TODO(sjmiles): tests lots of old stuff
  it('multiplex recipe with slots - immediate', async () => {
    const {manifest, recipe, observer, arc} = await initializeManifestAndArc({
      'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'
    });

    observer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {times: 2})
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {})
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {times: 2, isOptional: true})
      ;

    const inStore = await instantiateRecipeAndStore(arc, recipe, manifest);
    await arc.pec.idle;
    await observer.expectationsCompleted();

    // Verify slot template and models.
    // assert.lengthOf(slotComposer.consumers, 3);
    // assert.isTrue(slotComposer.consumers[0].slotContext instanceof ProvidedSlotContext);
    // assert.isTrue(slotComposer.consumers[1].slotContext instanceof HostedSlotContext);
    // assert.isTrue(slotComposer.consumers[2].slotContext instanceof HostedSlotContext);
    // const slot = slotComposer.consumers[0];
    // verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2'});

    // Add one more element.
    await inStore.add(Entity.identify(new inStore.entityClass({value: 'foo3'}), 'subid-3'));
    observer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation')
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet')
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet')
      ;
    await arc.pec.idle;
    await observer.expectationsCompleted();

    //verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2', 'subid-3': 'foo3'});
  });

  // TODO(sjmiles): tests lots of old stuff
  it('multiplex recipe with slots - init context later', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    const {manifest, recipe, observer, arc} = await initializeManifestAndArc();
    //(slotComposer.getAvailableContexts()[0] as ProvidedSlotContext).container = null;
    const inStore = await instantiateRecipeAndStore(arc, recipe, manifest);

    // Wait for the hosted slots to be initialized in slot-composer.
    // await new Promise((resolve, reject) => {
    //   const myInterval = setInterval(() => {
    //     if (slotComposer.consumers.length === 3) { // last 2 are hosted slots
    //       resolve();
    //       clearInterval(myInterval);
    //     }
    //   }, 10);
    // });

    observer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {times: 2})
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {})
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {times: 2, isOptional: true})
      ;

    // tslint:disable-next-line: no-any
    // (slotComposer.getAvailableContexts()[0] as ProvidedSlotContext).container = {'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'} as any;
    // slotComposer.consumers[0].onContainerUpdate({}, undefined);

    await arc.pec.idle;
    await observer.expectationsCompleted();

    // Verify slot template and models.
    // assert.lengthOf(slotComposer.consumers, 3);
    // const slot = slotComposer.consumers[0];
    // verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2'});

    // Add one more element.
    await inStore.add(Entity.identify(new inStore.entityClass({value: 'foo3'}), 'subid-3'));
    observer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation')
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet')
      //.expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {times: 2, isOptional: true})
      ;
    await arc.pec.idle;
    await observer.expectationsCompleted();

    // Verify slot template and models.
    //verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2', 'subid-3': 'foo3'});
  });
});
