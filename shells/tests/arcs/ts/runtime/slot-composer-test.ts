/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Planner} from '../../../../../build/planning/arcs-planning.js';
import {assert} from '../../../../../build/platform/chai-web.js';
import {Loader} from '../../../../../build/platform/loader.js';
import {SlotComposer} from '../../../../../build/runtime/slot-composer.js';
import {SlotTestObserver} from '../../../../../build/runtime/testing/slot-test-observer.js';
import {StrategyTestHelper} from '../../../../../build/planning/testing/strategy-test-helper.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../../../../build/runtime/testing/handle-for-test.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

class TestSlotComposer extends SlotComposer {
  public readonly observer;
  constructor() {
    super();
    this.observer = new SlotTestObserver();
    this.observeSlots(this.observer);
  }
}

async function init(recipeStr) {
  const loader = new Loader(null, {
    '*': `
      defineParticle(({UiParticle}) => {
        return class P extends UiParticle {
          get template() {
            return '&nbsp;';
          }
        }
      });
    `
  });
  const runtime = new Runtime({loader, composerClass: TestSlotComposer});
  runtime.context = await runtime.parse(recipeStr);

  const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test-arc'}));

  const planner = new Planner();
  const options = {runtime, strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
  planner.init(arc, options);

  await planner.strategizer.generate();
  assert.lengthOf(planner.strategizer.population, 1);

  const observer = (arc.peh.slotComposer as TestSlotComposer).observer;
  const plan = planner.strategizer.population[0].result;

  return {runtime, arc, observer, plan};
}

describe('slot composer', () => {
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

    let {runtime, arc, observer, plan} = await init(manifestStr);

    // instantiate the recipe
    plan = plan.clone();
    plan.normalize();
    assert.isTrue(plan.isResolved());

    observer.newExpectations()
        .expectRenderSlot('A', 'root')
        .expectRenderSlot('B', 'mySlot')
        .expectRenderSlot('BB', 'mySlot')
        .expectRenderSlot('C', 'otherSlot')
        ;
    await runtime.allocator.runPlanInArc(arc.id, plan);
    await observer.expectationsCompleted();
  });

  // This test passes when run by itself. It times out when run with all the
  // other tests. It passes, though, if "expectationsCompleted" is commented
  // out. If any individual expectation is skipped, the test complains because
  // it receives an expectation it doesn't expect.
  // TODO(sjmiles): really an integration test for ui-multiplexer-particle.ts and Multiplexer.js
  // TODO(sjmiles): skipping for now because it fails ~10% of the time, I suspect this is a race-condition
  // in the render expectations; rendering uses _eventual correctness_ so it's not necessarily
  // deterministic: we may need to update the expectations system to take this into account.
  it.skip('initialize recipe and render hosted slots', async () => {
    const manifest = `./shells/tests/artifacts/ProductsTestNg.arcs`;
    const runtime = new Runtime();
    runtime.context = await runtime.parseFile(manifest);

    const slotObserver = new SlotTestObserver();
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest(), slotObserver}));
    const suggestions = await StrategyTestHelper.planForArc(runtime, arc);

    const suggestion = suggestions.find(s => s.plan.name === 'FilterAndDisplayBooks');
    assert.deepEqual(
      suggestion.plan.particles.map(p => p.name).sort(),
      ['ItemMultiplexer', 'List', 'ProductFilter']
    );

    slotObserver
        .newExpectations()
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('ShowProduct', 'item');
    await runtime.allocator.runPlanInArc(arc.id, suggestion.plan);
    await slotObserver.expectationsCompleted();
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

    let {runtime, arc, observer, plan} = await init(manifestStr);

    plan = plan.clone();
    plan.normalize();
    assert.isTrue(plan.isResolved());

    observer.newExpectations()
        .expectRenderSlot('A', 'root')
        .expectRenderSlot('B', 'item')
        .expectRenderSlot('C', 'item')
        ;
    await runtime.allocator.runPlanInArc(arc.id, plan);
    await observer.expectationsCompleted();
  });

  it('renders inner slots in transformations without intercepting', async () => {
    const staticFiles = {
      './TransformationParticle.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            await innerArc.loadRecipe(\`
              particle A in './A.js'
                content: consumes
                  detail: provides

              particle B in './B.js'
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
      './A.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          get template() {
            return '<div><span>{{a}}</span><div slotid="detail"></div></div>';
          }
          render() {
            return {a: 'A content'};
          }
        };
      });`,
      './B.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          get template() {
            return '<div>{{b}}</div>';
          }
          render() {
            return {b: 'B content'};
          }
        };
      });`
    };

    const contextText = `
      particle TransformationParticle in './TransformationParticle.js'
        root: consumes
      recipe
        slot0: slot 'rootslotid-root'
        TransformationParticle
          root: consumes slot0
    `;

    const loader = new Loader(null, staticFiles);
    const runtime = new Runtime({loader});
    runtime.context = await runtime.parse(contextText);

    const slotObserver = new SlotTestObserver();
    slotObserver.newExpectations()
        .expectRenderSlot('A', 'content')
        .expectRenderSlot('B', 'detail')
        ;

    await runtime.allocator.startArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest(), slotObserver});

    await slotObserver.expectationsCompleted();
  });

});
