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
import {Arc} from '../arc.js';
import {ArcId} from '../id.js';
import {HeadlessSlotDomConsumer} from '../headless-slot-dom-consumer.js';
import {Manifest} from '../manifest.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {StubLoader} from '../testing/stub-loader.js';

describe('Particle Execution Context', () => {
  it('substitutes slot names for model references', async () => {
    const context = await Manifest.parse(`
      particle A in 'A.js'
        root: consumes Slot
          detail: provides? Slot
          annotation: provides? Slot

      recipe
        slot0: slot 'rootslotid-root'
        A
          root: consumes slot0`);
    const loader = new StubLoader({
      'A.js': `defineParticle(({DomParticle}) => {
        return class extends DomParticle {
          get template() { return '<div><div slotid$="{{$detail}}"></div><div slotid="annotation"></div></div>'; }
        };
      });`
    });
    const slotComposer = new MockSlotComposer({strict: false}).newExpectations('debug');
    const arc = new Arc({id: ArcId.newForTest('demo'), storageKey: 'volatile://', slotComposer, loader, context});
    const [recipe] = arc.context.recipes;
    recipe.normalize();
    await arc.instantiate(recipe);

    const slotConsumer = slotComposer.consumers[0] as HeadlessSlotDomConsumer;
    const detailContext = slotConsumer.directlyProvidedSlotContexts.find(ctx => ctx.name === 'detail');
    const annotationContext = slotConsumer.directlyProvidedSlotContexts.find(ctx => ctx.name === 'annotation');

    await slotConsumer.contentAvailable;
    assert.deepEqual(
        `<div><div slotid$="{{$detail}}"></div><div slotname="annotation" slotid$="{{$annotation}}"></div></div>`,
        slotConsumer._content.template);
    assert.deepEqual({
      '$annotation': annotationContext.id,
      '$detail': detailContext.id
    }, slotConsumer._content.model);
  });
});
