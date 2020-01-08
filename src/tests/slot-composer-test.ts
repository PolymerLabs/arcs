/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Planner} from '../planning/arcs-planning.js';
import {assert} from '../platform/chai-web.js';
import {Arc} from '../runtime/arc.js';
import {SlotComposer} from '../runtime/slot-composer.js';
import {HeadlessSlotDomConsumer} from '../runtime/headless-slot-dom-consumer.js';
import {Loader} from '../platform/loader.js';
import {HostedSlotContext, ProvidedSlotContext} from '../runtime/slot-context.js';
//import {MockSlotComposer} from '../runtime/testing/mock-slot-composer.js';
import {SlotTestObserver} from '../runtime/testing/slot-test-observer.js';
import {StubLoader} from '../runtime/testing/stub-loader.js';
import {StrategyTestHelper} from '../planning/testing/strategy-test-helper.js';
import {Id, ArcId} from '../runtime/id.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';

async function initSlotComposer(recipeStr) {
  //const slotComposer = new MockSlotComposer().newExpectations();
  const manifest = await Manifest.parse(recipeStr);
  const loader = new StubLoader({
    '*': `defineParticle(({UiParticle}) => {
      return class P extends UiParticle {
        get template() {
          return '<span>Hello World</span>';
        }
      }
    });`
  });
  const slotComposer = new SlotComposer();
  const arc = new Arc({
    id: ArcId.newForTest('test-plan-arc'),
    context: manifest,
    slotComposer,
    loader
  });
  const observer = new SlotTestObserver();
  slotComposer.observeSlots(observer);
  observer.newExpectations();
  //
  //const startRenderParticles: string[] = [];
  //arc.pec.startRender = ({particle}) => { startRenderParticles.push(particle.name); };
  //
  const planner = new Planner();
  const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
  planner.init(arc, options);
  await planner.strategizer.generate();
  assert.lengthOf(planner.strategizer.population, 1);
  //
  const plan = planner.strategizer.population[0].result;
  return {arc, slotComposer, observer, plan/*, startRenderParticles*/};
}

describe('slot composer', () => {
  // TODO(sjmiles): why?
  //this.timeout(4000);

  it('initialize recipe and render slots', async () => {
    const manifestStr = `
particle A in 'a.js'
  root: consumes Slot
    mySlot: provides? Slot
    otherSlot: provides? Slot
particle B in 'b.js'
  mySlot: consumes Slot
particle BB in 'bb.js'
  mySlot: consumes Slot
particle C in 'c.js'
  otherSlot: consumes Slot
recipe
  slot0: slot 'rootslotid-root'
  A
    root: consumes slot0
      mySlot: provides slot1
      otherSlot: provides slot2
  B
    mySlot: consumes slot1
  BB
    mySlot: consumes slot1
  C
    otherSlot: consumes slot2
    `;
    let {arc, slotComposer, observer, plan/*, startRenderParticles*/} = await initSlotComposer(manifestStr);

    // TODO(sjmiles): contexts are deprecated
    //assert.lengthOf(slotComposer.getAvailableContexts(), 1);
    // const verifyContext = (name: string, expected) => {
    //   const context = slotComposer.findContextsByName(name)[0];
    //   assert.exists(context);
    //   assert.strictEqual(expected.sourceSlotName, context.sourceSlotConsumer ? context.sourceSlotConsumer.consumeConn.name : undefined);
    //   assert.strictEqual(expected.hasContainer, Boolean(context.container));
    //   assert.deepEqual(expected.consumeConnNames || [], context.slotConsumers.map(slot => slot.consumeConn.getQualifiedName()));
    // };
    // verifyContext('root', {hasContainer: true});

    plan = plan.clone();

    // instantiate the recipe
    plan.normalize();
    assert.isTrue(plan.isResolved());
    assert.strictEqual(arc.pec.slotComposer, slotComposer);

    observer
      .expectRenderSlot('A', 'root')
      .expectRenderSlot('B', 'mySlot')
      .expectRenderSlot('BB', 'mySlot')
      .expectRenderSlot('C', 'otherSlot')
      ;
    await arc.instantiate(plan);
    //assert.deepEqual(['A'], startRenderParticles);

    // TODO(sjmiles): contexts are deprecated
    // assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    // verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    // verifyContext('mySlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    // verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});

    // render root slot
    // const particle = arc.activeRecipe.particles[0];
    // const rootSlot = slotComposer.getSlotConsumer(particle, 'root');
    // const mySlotId = slotComposer.findContextsByName('mySlot')[0].id;
    // rootSlot.getInnerContainer = (slotId) => slotId === mySlotId ? 'dummy-inner-container' : null;
    //startRenderParticles = [];

    //await slotComposer.renderSlot(particle, 'root', {model: {'foo': 'bar'}});
    //assert.deepEqual(startRenderParticles, ['B', 'BB'], );
    //assert.deepEqual(rootSlot.getRendering().model, {foo: 'bar'});

    // assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    // verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    // verifyContext('mySlot', {hasContainer: true, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    // verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});

    await observer.expectationsCompleted();
  });

  it('initialize recipe and render hosted slots', async () => {
    //const loader = new StubLoader({});
    const loader = new Loader();
    const context = await Manifest.load('./src/tests/particles/artifacts/products-test.recipes', loader);
    const runtime = new Runtime({loader, context});
    //
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    //
    const suggestions = await StrategyTestHelper.planForArc(arc);
    const suggestion = suggestions.find(s => s.plan.name === 'FilterAndDisplayBooks');
    assert.deepEqual(
        suggestion.plan.particles.map(p => p.name).sort(),
        ['ItemMultiplexer', 'List', 'ProductFilter']
    );
    //
    const slotComposer = arc.pec.slotComposer;
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);
    observer
      .newExpectations()
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('ShowProduct', 'item')
      ;
    //
    await arc.instantiate(suggestion.plan);
    await arc.idle;
    //
    assert.lengthOf(slotComposer.consumers, 3);
    // assert.strictEqual(ProvidedSlotContext, slotComposer.consumers.find(c => c.consumeConn.particle.name === 'ItemMultiplexer').slotContext.constructor);
    // assert.strictEqual(ProvidedSlotContext, slotComposer.consumers.find(c => c.consumeConn.particle.name === 'List').slotContext.constructor);
    // assert.strictEqual(HostedSlotContext, slotComposer.consumers.find(c => c.consumeConn.particle.name === 'ShowProduct').slotContext.constructor);
    await observer.expectationsCompleted();
  });

  it('allows set slots to be consumed as a singleton slot', async () => {
    const manifestStr = `
    particle A in 'a.js'
      root: consumes Slot
        item: provides? [Slot]
    particle B in 'b.js'
      item: consumes Slot
    particle C in 'c.js'
      item: consumes Slot
    recipe
      slot0: slot 'rootslotid-root'
      A
        root: consumes slot0
          item: provides slot1
      B
        item: consumes slot1
      C
        item: consumes slot1
    `;

    let {arc, observer, plan} = await initSlotComposer(manifestStr);

    plan = plan.clone();
    plan.normalize();
    assert.isTrue(plan.isResolved());

    observer
      .expectRenderSlot('A', 'root')
      .expectRenderSlot('B', 'item')
      .expectRenderSlot('C', 'item')
      ;

    await arc.instantiate(plan);

    //assert.deepEqual(['A'], startRenderParticles);

    //const [particleA, particleB, particleC] = arc.activeRecipe.particles;
    //const rootSlot = slotComposer.getSlotConsumer(particleA, 'root');

    //const itemSlotId = slotComposer.findContextsByName('item')[0].id;
    //rootSlot.getInnerContainer = (slotId) => slotId === itemSlotId
    //    ? {'id1': 'dummy-inner-container-1', 'id2': 'dummy-inner-container-2'}
    //    : null;
    //startRenderParticles = [];
    //await slotComposer.renderSlot(particleA, 'root', {model: {'foo': 'bar'}});
    //assert.deepEqual(['B', 'C'], startRenderParticles);

    // const gatherRenderings = slotContext => {
    //   const result = {};
    //   for (const consumer of slotContext.slotConsumers) {
    //     for (const [subId, content] of consumer.renderings) {
    //       if (!result[subId]) result[subId] = [];
    //       if (content.model) result[subId].push(content.model.title);
    //     }
    //   }
    //   return result;
    // };

    // const itemSlotContext = slotComposer.findContextsByName('item')[0];

    // await slotComposer.renderSlot(particleB, 'item', {model: {subId: 'id1', title: 'Rendered by B'}});
    // await slotComposer.renderSlot(particleC, 'item', {model: {subId: 'id2', title: 'Rendered by C'}});
    // assert.deepEqual({'id1': ['Rendered by B'], 'id2': ['Rendered by C']}, gatherRenderings(itemSlotContext));

    // await slotComposer.renderSlot(particleB, 'item', {model: {subId: 'id2', title: 'B moved to id2'}});
    // assert.deepEqual({'id1': [], 'id2': ['B moved to id2', 'Rendered by C']}, gatherRenderings(itemSlotContext));

    // await slotComposer.renderSlot(particleC, 'item', {model: {subId: 'id1', title: 'C moved to id1'}});
    // assert.deepEqual({'id1': ['C moved to id1'], 'id2': ['B moved to id2']}, gatherRenderings(itemSlotContext));
    // await slotComposer.expectationsCompleted();
    await observer.expectationsCompleted();
  });

  it('renders inner slots in transformations without intercepting', async () => {
    const loader = new StubLoader({
        'TransformationParticle.js': `defineParticle(({UiParticle}) => {
          return class extends UiParticle {
            async setHandles(handles) {
              super.setHandles(handles);

              const innerArc = await this.constructInnerArc();
              const hostedSlotId = await innerArc.createSlot(this, 'root');

              innerArc.loadRecipe(\`
                particle A in 'A.js'
                  content: consumes
                    detail: provides

                particle B in 'B.js'
                  detail: consumes

                recipe
                  hosted: slot '\` + hostedSlotId + \`'
                  A
                    content: consumes hosted
                      detail: provides detail
                  B
                    detail: consumes detail
              \`);
            }

            renderHostedSlot(slotName, hostedSlotId, content) {
              this.setState(content);
            }

            shouldRender() {
              return Boolean(this.state.template);
            }

            getTemplate() {
              return '<div>intercepted-template' + this.state.template + '</div>';
            }

            getTemplateName() {
              return this.state.templateName + '/intercepted';
            }

            render() {
              return Object.assign({}, this.state.model, {a: this.state.model.a + '/intercepted-model'});
            }
          };
        });`,
        'A.js': `defineParticle(({UiParticle}) => {
          return class extends UiParticle {
            get template() {
              return '<div><span>{{a}}</span><div slotid="detail"></div></div>';
            }
            render() {
              return {a: 'A content'};
            }
          };
        });`,
        'B.js': `defineParticle(({UiParticle}) => {
          return class extends UiParticle {
            get template() {
              return '<div>{{b}}</div>';
            }
            render() {
              return {b: 'B content'};
            }
          };
        });`
    });
    const context = await Manifest.parse(`
      particle TransformationParticle in 'TransformationParticle.js'
        root: consumes

      recipe
        slot0: slot 'rootslotid-root'
        TransformationParticle
          root: consumes slot0`, {loader, fileName: ''}
    );
    const runtime = new Runtime({loader, context});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const slotComposer = arc.pec.slotComposer;

    const [recipe] = arc.context.recipes;
    recipe.normalize();

    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);
    observer.newExpectations()
      .expectRenderSlot('A', 'content')
      .expectRenderSlot('B', 'detail')
      ;

    await arc.instantiate(recipe);

    // const rootSlotConsumer = slotComposer.consumers.find(consumer => consumer.consumeConn.name === 'root') as HeadlessSlotDomConsumer;
    // await rootSlotConsumer.contentAvailable;

    // const detailSlotConsumer = slotComposer.consumers.find(consumer => consumer.consumeConn.name === 'detail') as HeadlessSlotDomConsumer;
    // await detailSlotConsumer.contentAvailable;

    // assert.deepEqual(rootSlotConsumer._content, {
    //   model: {
    //     a: 'A content/intercepted-model',
    //     '$detail': `!${detailSlotConsumer.arc.id.root}:demo:inner2:slot2`
    //   },
    //   template: `<div>intercepted-template<div><span>{{a}}</span><div slotid$="{{$detail}}"></div></div></div>`,
    //   templateName: 'A::content::default/intercepted'
    // });

    // assert.deepEqual(detailSlotConsumer._content, {
    //   model: {b: 'B content'},
    //   template: '<div>{{b}}</div>',
    //   templateName: 'default',
    // });

    await observer.expectationsCompleted();
  });
});
