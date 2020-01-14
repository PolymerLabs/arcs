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
import {HeadlessSlotDomConsumer} from '../runtime/headless-slot-dom-consumer.js';
import {Loader} from '../platform/loader.js';
import {HostedSlotContext, ProvidedSlotContext} from '../runtime/slot-context.js';
import {SlotComposer} from '../runtime/slot-composer.js';
import {SlotTestObserver} from '../runtime/testing/slot-test-observer.js';
import {StrategyTestHelper} from '../planning/testing/strategy-test-helper.js';
import {Id, ArcId} from '../runtime/id.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';

async function initSlotComposer(recipeStr) {
  const manifest = await Manifest.parse(recipeStr);

  const loader = new Loader(null, {
    '*': `defineParticle(({Particle}) => { return class P extends Particle {} });`
  });
  console.warn(loader.staticMap);
  console.warn(await loader.loadResource('foo.js'));

  const slotComposer = new SlotComposer();
  const observer = new SlotTestObserver();
  slotComposer.observeSlots(observer);

  const arc = new Arc({
    id: ArcId.newForTest('test-plan-arc'),
    context: manifest,
    slotComposer,
    loader
  });

  const planner = new Planner();
  const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
  planner.init(arc, options);
  await planner.strategizer.generate();
  assert.lengthOf(planner.strategizer.population, 1);
  const plan = planner.strategizer.population[0].result;
  return {arc, slotComposer, observer, plan};
}

describe('slot composer FOOB', function() {
  // TODO(sjmiles): what is/was this for?
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

    let {arc, slotComposer, observer, plan} = await initSlotComposer(manifestStr);

    // instantiate the recipe
    plan = plan.clone();
    plan.normalize();
    assert.isTrue(plan.isResolved());
    assert.strictEqual(arc.pec.slotComposer, slotComposer);

    observer.newExpectations()
      .expectRenderSlot('A', 'root')
      ;

    await arc.instantiate(plan);
    await arc.idle;

    // render root slot
    // const particle = arc.activeRecipe.particles[0];
    // const rootSlot = slotComposer.getSlotConsumer(particle, 'root');
    //const mySlotId = slotComposer.findContextsByName('mySlot')[0].id;
    // rootSlot.getInnerContainer = (slotId) => slotId === mySlotId ? 'dummy-inner-container' : null;
    // startRenderParticles.length = 0;
    // await slotComposer.renderSlot(particle, 'root', {model: {'foo': 'bar'}});
    // assert.deepEqual(['B', 'BB'], startRenderParticles);

    // TODO(sjmiles): render data no longer captured by slot objects
    //assert.deepEqual({foo: 'bar'}, rootSlot.getRendering().model);

    // TODO(sjmiles): contexts deprecated
    // assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    // verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    // verifyContext('mySlot', {hasContainer: true, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    // verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});

    await observer.expectationsCompleted();
  });

  // TODO(sjmiles): missing info on why this is skipped
  it.skip('initialize recipe and render hosted slots', async () => {
    const loader = new Loader();
    const context = await Manifest.load('./src/tests/particles/artifacts/products-test.recipes', loader);
    const runtime = new Runtime({loader, context});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const slotComposer = arc.pec.slotComposer;
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);

    observer
      .newExpectations()
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('ShowProduct', 'item')
      ;

    const suggestions = await StrategyTestHelper.planForArc(arc);
    const suggestion = suggestions.find(s => s.plan.name === 'FilterAndDisplayBooks');
    assert.deepEqual(
        suggestion.plan.particles.map(p => p.name).sort(),
        ['ItemMultiplexer', 'List', 'ProductFilter']);
    await suggestion.instantiate(arc);
    await arc.idle;

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

    observer.newExpectations()
      .expectRenderSlot('A', 'root')
      .expectRenderSlot('B', 'item')
      .expectRenderSlot('C', 'item')
      .expectRenderSlot('B', 'item')
      .expectRenderSlot('C', 'item')
      ;
    await arc.instantiate(plan);
    await observer.expectationsCompleted();
  });

  // TODO(sjmiles): missing info on why this is skipped
  it.skip('renders inner slots in transformations without intercepting', async () => {
    const loader = new Loader(null, {
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
          root: consumes slot0`, {loader, fileName: ''});
    const runtime = new Runtime({loader, context});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const [recipe] = arc.context.recipes;
    recipe.normalize();

    const slotComposer = arc.pec.slotComposer;
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);
    observer.newExpectations()
        .expectRenderSlot('A', 'content')
        .expectRenderSlot('TransformationParticle', 'root')
        .expectRenderSlot('B', 'detail')
        .expectRenderSlot('TransformationParticle', 'root')
        .expectRenderSlot('A', 'content')
        .expectRenderSlot('TransformationParticle', 'root')
        .expectRenderSlot('B', 'detail')
        ;
    await arc.instantiate(recipe);
    await observer.expectationsCompleted();
  });
});
