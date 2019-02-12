/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Planner} from '../../planning/planner.js';
import {StrategyTestHelper} from '../../planning/test/strategies/strategy-test-helper.js';
import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../loader.js';
import {Random} from '../random.js';
import {HostedSlotContext, ProvidedSlotContext} from '../slot-context.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {MockSlotDomConsumer} from '../testing/mock-slot-dom-consumer.js';
import {StubLoader} from '../testing/stub-loader.js';
import {TestHelper} from '../testing/test-helper.js';

async function initSlotComposer(recipeStr) {
  const slotComposer = new MockSlotComposer().newExpectations();

  const manifest = await TestHelper.parseManifest(recipeStr, new Loader());
  const loader = new StubLoader({
    '*': `defineParticle(({Particle}) => { return class P extends Particle {} });`
  });
  const arc = new Arc({
    id: 'test-plan-arc',
    context: manifest,
    slotComposer,
    loader
  });
  const startRenderParticles = [];
  arc.pec.startRender = ({particle}) => { startRenderParticles.push(particle.name); };
  const planner = new Planner();
  const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
  planner.init(arc, options);
  await planner.strategizer.generate();
  assert.lengthOf(planner.strategizer.population, 1);
  const plan = planner.strategizer.population[0].result;
  return {arc, slotComposer, plan, startRenderParticles};
}

describe('slot composer', () => {
  it('initialize recipe and render slots', async () => {
    const manifestStr = `
particle A in 'a.js'
  consume root
    provide mySlot
    provide otherSlot
particle B in 'b.js'
  consume mySlot
particle BB in 'bb.js'
  consume mySlot
particle C in 'c.js'
  consume otherSlot
recipe
  slot 'rootslotid-root' as slot0
  A
    consume root as slot0
      provide mySlot as slot1
      provide otherSlot as slot2
  B
    consume mySlot as slot1
  BB
    consume mySlot as slot1
  C
    consume otherSlot as slot2
        `;
    let {arc, slotComposer, plan, startRenderParticles} = await initSlotComposer(manifestStr);
    slotComposer = slotComposer.expectRenderSlot('A', 'root', {'contentTypes': ['model']});

    assert.lengthOf(slotComposer.getAvailableContexts(), 1);

    const verifyContext = (name: string, expected) => {
      const context = slotComposer.findContextsByName(name)[0];
      assert.exists(context);
      assert.equal(expected.sourceSlotName, context.sourceSlotConsumer ? context.sourceSlotConsumer.consumeConn.name : undefined);
      assert.equal(expected.hasContainer, Boolean(context.container));
      assert.deepEqual(expected.consumeConnNames || [], context.slotConsumers.map(slot => slot.consumeConn.getQualifiedName()));
    };
    verifyContext('root', {hasContainer: true});

    plan = plan.clone();

    // instantiate the recipe
    plan.normalize();
    assert.isTrue(plan.isResolved());
    assert.equal(arc.pec.slotComposer, slotComposer);
    await arc.instantiate(plan);
    assert.deepEqual(['A'], startRenderParticles);
    assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    verifyContext('mySlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});

    // render root slot
    const particle = arc.activeRecipe.particles[0];
    const rootSlot = slotComposer.getSlotConsumer(particle, 'root');
    const mySlotId = slotComposer.findContextsByName('mySlot')[0].id;
    rootSlot.getInnerContainer = (slotId) => slotId === mySlotId ? 'dummy-inner-container' : null;
    startRenderParticles.length = 0;
    await slotComposer.renderSlot(particle, 'root', {model: {'foo': 'bar'}});
    assert.deepEqual(['B', 'BB'], startRenderParticles);
    assert.deepEqual({foo: 'bar'}, rootSlot.getRendering().model);

    assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    verifyContext('mySlot', {hasContainer: true, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});
    await slotComposer.expectationsCompleted();
  });

  it('initialize recipe and render hosted slots', async () => {
    const slotComposer = new MockSlotComposer().newExpectations()
      .expectRenderSlot('List', 'root', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('List', 'root', {'contentTypes': ['model', 'templateName']})
      .expectRenderSlot('ShowProduct', 'item', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('ItemMultiplexer', 'item', {'contentTypes': ['template', 'model', 'templateName']});

    const helper = await TestHelper.createAndPlan({
      manifestFilename: './src/runtime/test/particles/artifacts/products-test.recipes',
      slotComposer
    });

    await helper.acceptSuggestion({particles: ['ItemMultiplexer', 'List', 'ProductFilter']});
    assert.lengthOf(slotComposer.consumers, 3);
    assert.equal(ProvidedSlotContext, slotComposer.consumers.find(c => c.consumeConn.particle.name === 'ItemMultiplexer').slotContext.constructor);
    assert.equal(ProvidedSlotContext, slotComposer.consumers.find(c => c.consumeConn.particle.name === 'List').slotContext.constructor);
    assert.equal(HostedSlotContext, slotComposer.consumers.find(c => c.consumeConn.particle.name === 'ShowProduct').slotContext.constructor);
    await slotComposer.expectationsCompleted();
  });

  it('allows set slots to be consumed as a singleton slot', async () => {
    const manifestStr = `
    particle A in 'a.js'
      consume root
        provide set of item
    particle B in 'b.js'
      consume item
    particle C in 'c.js'
      consume item
    recipe
      slot 'rootslotid-root' as slot0
      A
        consume root as slot0
          provide item as slot1
      B
        consume item as slot1
      C
        consume item as slot1
    `;

    let {arc, slotComposer, plan, startRenderParticles} = await initSlotComposer(manifestStr);
    slotComposer = slotComposer
      .expectRenderSlot('A', 'root', {'contentTypes': ['model']})
      .expectRenderSlot('B', 'item', {'contentTypes': ['model']})
      .expectRenderSlot('C', 'item', {'contentTypes': ['model']})
      .expectRenderSlot('B', 'item', {'contentTypes': ['model']})
      .expectRenderSlot('C', 'item', {'contentTypes': ['model']});

    assert.lengthOf(slotComposer.getAvailableContexts(), 1);

    plan = plan.clone();
    plan.normalize();
    assert.isTrue(plan.isResolved());
    await arc.instantiate(plan);

    assert.deepEqual(['A'], startRenderParticles);

    const [particleA, particleB, particleC] = arc.activeRecipe.particles;
    const rootSlot = slotComposer.getSlotConsumer(particleA, 'root');
    const itemSlotId = slotComposer.findContextsByName('item')[0].id;
    rootSlot.getInnerContainer = (slotId) => slotId === itemSlotId
        ? {'id1': 'dummy-inner-container-1', 'id2': 'dummy-inner-container-2'}
        : null;
    startRenderParticles.length = 0;
    await slotComposer.renderSlot(particleA, 'root', {model: {'foo': 'bar'}});
    assert.deepEqual(['B', 'C'], startRenderParticles);

    const gatherRenderings = slotContext => {
      const result = {};
      for (const consumer of slotContext.slotConsumers) {
        for (const [subId, content] of consumer.renderings) {
          if (!result[subId]) result[subId] = [];
          if (content.model) result[subId].push(content.model.title);
        }
      }
      return result;
    };

    const itemSlotContext = slotComposer.findContextsByName('item')[0];

    await slotComposer.renderSlot(particleB, 'item', {model: {subId: 'id1', title: 'Rendered by B'}});
    await slotComposer.renderSlot(particleC, 'item', {model: {subId: 'id2', title: 'Rendered by C'}});
    assert.deepEqual({'id1': ['Rendered by B'], 'id2': ['Rendered by C']}, gatherRenderings(itemSlotContext));

    await slotComposer.renderSlot(particleB, 'item', {model: {subId: 'id2', title: 'B moved to id2'}});
    assert.deepEqual({'id1': [], 'id2': ['B moved to id2', 'Rendered by C']}, gatherRenderings(itemSlotContext));

    await slotComposer.renderSlot(particleC, 'item', {model: {subId: 'id1', title: 'C moved to id1'}});
    assert.deepEqual({'id1': ['C moved to id1'], 'id2': ['B moved to id2']}, gatherRenderings(itemSlotContext));
    await slotComposer.expectationsCompleted();
  });

  it('renders inner slots in transformations without intercepting', async () => {
    Random.seedForTests();
    const slotComposer = new MockSlotComposer().newExpectations()
      .expectRenderSlot('A', 'content', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('TransformationParticle', 'root', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('B', 'detail', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('TransformationParticle', 'root', {'contentTypes': ['model', 'templateName']})
      .expectRenderSlot('A', 'content', {'contentTypes': ['model', 'templateName']})
      .expectRenderSlot('TransformationParticle', 'root', {'contentTypes': ['model', 'templateName']})
      .expectRenderSlot('B', 'detail', {'contentTypes': ['model', 'templateName']});

    const {arc} = await TestHelper.create({
      manifestString: `
        particle TransformationParticle in 'TransformationParticle.js'
          consume root

        recipe
          slot 'rootslotid-root' as slot0
          TransformationParticle
            consume root as slot0`,
      loader: new StubLoader({
        'TransformationParticle.js': `defineParticle(({DomParticle}) => {
          return class extends DomParticle {
            async setHandles(handles) {
              super.setHandles(handles);
  
              const innerArc = await this.constructInnerArc();
              const hostedSlotId = await innerArc.createSlot(this, 'root');
        
              innerArc.loadRecipe(\`
                particle A in 'A.js'
                  consume content
                    provide detail
                
                particle B in 'B.js'
                  consume detail
                
                recipe
                  slot '\` + hostedSlotId + \`' as hosted
                  A
                    consume content as hosted
                      provide detail as detail
                  B
                    consume detail as detail
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
        'A.js': `defineParticle(({DomParticle}) => {
          return class extends DomParticle {
            get template() {
              return '<div><span>{{a}}</span><div slotid="detail"></div></div>';
            }
            render() {
              return {a: 'A content'};
            }
          };
        });`,
        'B.js': `defineParticle(({DomParticle}) => {
          return class extends DomParticle {
            get template() {
              return '<div>{{b}}</div>';
            }
            render() {
              return {b: 'B content'};
            }
          };
        });`
      }),
      slotComposer
    });

    const [recipe] = arc.context.recipes;
    recipe.normalize();
    await arc.instantiate(recipe);

    const rootSlotConsumer = slotComposer.consumers.find(consumer => consumer.consumeConn.name === 'root') as MockSlotDomConsumer;
    await rootSlotConsumer.contentAvailable;

    const detailSlotConsumer = slotComposer.consumers.find(consumer => consumer.consumeConn.name === 'detail') as MockSlotDomConsumer;
    await detailSlotConsumer.contentAvailable;

    assert.deepEqual(rootSlotConsumer._content, {
      model: {
        a: 'A content/intercepted-model',
        '$detail': 'slotid-!493604905418752:demo:inner2:2'
      },
      template: `<div>intercepted-template<div><span>{{a}}</span><div slotid$="{{$detail}}"></div></div></div>`,
      templateName: 'A::content::default/intercepted'
    });

    assert.deepEqual(detailSlotConsumer._content, {
      model: {b: 'B content'},
      template: '<div>{{b}}</div>',
      templateName: 'default',
    });
    await slotComposer.expectationsCompleted();
  });
});
