/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/chai-web.js';
import {Entity} from '../runtime/entity.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {SlotTestObserver} from '../runtime/testing/slot-test-observer.js';
import {Loader} from '../platform/loader.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {collectionHandleForTest, storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';
import {StrategyTestHelper} from '../planning/testing/strategy-test-helper.js';
import {RamDiskStorageDriverProvider} from '../runtime/storageNG/drivers/ramdisk.js';
import {Flags} from '../runtime/flags.js';
import {DriverFactory} from '../runtime/storageNG/drivers/driver-factory.js';
import {VolatileCollection} from '../runtime/storage/volatile-storage.js';

describe('Multiplexer', () => {
  it('renders polymorphic multiplexed slots', async () => {
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const loader = new Loader();
    const manifest = './src/tests/particles/artifacts/polymorphic-muxing.recipes';
    const context = await Manifest.load(manifest, loader, {memoryProvider});

    const showOneParticle = context.particles.find(p => p.name === 'ShowOne');
    const showOneSpec = JSON.stringify(showOneParticle.toLiteral());
    const recipeOne =
`${showOneParticle.toString()}
  recipe
    h1: use '{{item_id}}'
    s1: slot '{{slot_id}}'
    ShowOne
      post: reads h1
      item: consumes s1`;

    const showTwoParticle = context.particles.find(p => p.name === 'ShowTwo');
    const showTwoSpec = JSON.stringify(showTwoParticle.toLiteral());
    const recipeTwo =
`${showTwoParticle.toString()}
  recipe
    v1: use '{{item_id}}'
    s1: slot '{{slot_id}}'
    ShowTwo
      post: reads v1
      item: consumes s1`;

    if (Flags.useNewStorageStack) {
      const postsHandle =
          await collectionHandleForTest(context, context.stores[0]);
      await postsHandle.add(Entity.identify(
          new postsHandle.entityClass({
            message: 'x',
            renderRecipe: recipeOne,
            renderParticleSpec: showOneSpec
          }),
          '1', null));
      await postsHandle.add(Entity.identify(
          new postsHandle.entityClass({
            message: 'y',
            renderRecipe: recipeTwo,
            renderParticleSpec: showTwoSpec
          }),
          '2', null));
      await postsHandle.add(Entity.identify(
          new postsHandle.entityClass({
            message: 'z',
            renderRecipe: recipeOne,
            renderParticleSpec: showOneSpec
          }),
          '3', null));
    } else {
      const postsStub = context.stores[0].castToStorageStub();
      postsStub.model.push({
        id: '1',
        keys: ['key1'],
        value: {
          id: '1',
          rawData: {message: 'x', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}
        }
      });
      postsStub.model.push({
        id: '2',
        keys: ['key2'],
        value: {
          id: '2',
          rawData: {message: 'y', renderRecipe: recipeTwo, renderParticleSpec: showTwoSpec}
        }
      });
      postsStub.model.push({
        id: '3',
        keys: ['key3'],
        value: {
          id: '3',
          rawData: {message: 'z', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}
        }
      });
      postsStub['referenceMode'] = false;
    }
    // version could be set here, but doesn't matter for tests.
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const observer = new SlotTestObserver();
    arc.peh.slotComposer.observeSlots(observer);

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);

    // Render 3 posts
    observer
      .newExpectations()
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('ShowOne', 'item', {times: 2})
      .expectRenderSlot('ShowTwo', 'item')
      ;

    await suggestions[0].instantiate(arc);
    await arc.idle;

    // Add and render one more post
    if (Flags.useNewStorageStack) {
      // new storage doesn't swallow duplicate writes to Singletons, so the multiplexer's behavior of always
      // updating all generated handles when the collection changes is reflected in the rendering pattern.
      observer
        .newExpectations()
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('ShowOne', 'item', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('ShowOne', 'item', {times: 2})
        .expectRenderSlot('ShowTwo', 'item')
        ;

    } else {
      observer
        .newExpectations()
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('ShowOne', 'item', {contentTypes: ['templateName', 'model']})
        ;
    }

    const postsStore = await collectionHandleForTest(arc, arc.findStoreById(arc.activeRecipe.handles[0].id));
    const entityClass = new postsStore.entityClass({
      message: 'w',
      renderRecipe: recipeOne,
      renderParticleSpec: showOneSpec
    });
    const entity = Entity.identify(entityClass, '4', null);
    await postsStore.add(entity);
    await arc.idle;

    DriverFactory.clearRegistrationsForTesting();
  });

  // TODO(sjmiles): probably should be in particles/tests/* because of Multiplexer.js
  // TODO(sjmiles): skipped because (in summary) plumbing data from the hostedParticle to the outer
  // arc is not this simple ... research is afoot
  it.skip('multiplexer can host non-slot-using particle', async () => {
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    //
    const canonMultiplexer = `./particles/List/source/Multiplexer.js`;
    const manifest = `
      schema Foo
        name: Text
      interface HostedFooParticle
        foo: reads Foo {name}
        //outFoos: writes [Foo {name}]
      particle FooMultiplexer in '${canonMultiplexer}'
        list: reads [Foo {name}]
        outFoos: writes [Foo {name}]
        hostedParticle: hosts HostedFooParticle
      particle FooNoop in './foo.js'
        foo: reads Foo {name}
        outFoos: writes [Foo {name}]
      store FooList of [Foo] #foos in './foo.json'
      recipe MultiFoo
        foos: map #foos
        outFoos: create
        FooMultiplexer
          list: foos
          outFoos: outFoos
          hostedParticle: FooNoop
    `;
    //
    const fooData = [{name: 'Alpha'}, {name: 'Beta'}, {name: 'Gamma'}];
    const statics = {
      './foo.json': JSON.stringify(fooData),
      './foo.js': `
        defineParticle(({UiParticle}) => {
          return class extends UiParticle {
            update({foo}) {
              console.log(\`adding [\${foo.name}] Foo to outFoos\`);
              this.add('outFoos', {name: foo.name});
            }
          };
        });`
    };
    //
    const loader = new Loader(null, statics);
    const context = await Manifest.parse(manifest, {fileName: './', loader, memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('fooTest', storageKeyPrefixForTest());
    //
    const recipe = context.recipes[0];
    const plan = await runtime.resolveRecipe(arc, recipe);
    await arc.instantiate(plan);
    await arc.idle;
    //
    const store = arc._stores[1] as VolatileCollection;
    const data = await store.toList();
    console.log(data);
    assert.equal(JSON.stringify(data), JSON.stringify(fooData), 'unexpected output data');
  });

});
