/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../../build/platform/chai-web.js';
import {Loader} from '../../../../../build/platform/loader.js';
import {Manifest} from '../../../../../build/runtime/manifest.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

describe('particle-api', () => {
  it('loadRecipe returns ids of provided slots', async () => {
    const context = await Manifest.parse(`
      particle TransformationParticle in 'TransformationParticle.js'
        root: consumes Slot

      recipe ApiTestRecipe
        slot0: slot 'rootslotid-root'
        TransformationParticle
          root: consumes slot0`);
    const loader = new Loader(null, {
      'TransformationParticle.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            const {providedSlotIds} = await innerArc.loadRecipe(\`
              particle A in 'A.js'
                content: consumes Slot
                  detail: provides? Slot

              recipe
                hosted: slot '\` + hostedSlotId + \`'
                A as a
                  content: consumes hosted
            \`);

            await innerArc.loadRecipe(\`
              particle B in 'B.js'
                detail: consumes Slot

              recipe
                detail: slot '\` + providedSlotIds['a.detail'] + \`'
                B
                  detail: consumes detail
            \`);
          }

          renderHostedSlot(slotName, hostedSlotId, content) {}
        };
      });`,
      '*': `defineParticle(({UiParticle}) => class extends UiParticle {});`,
    });
    const runtime = new Runtime({loader, context});
    const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'demo', planName: 'ApiTestRecipe'}));
    await arc.idle;

    assert.lengthOf(arc.activeRecipe.particles, 1);
    const [transformationParticle] = arc.activeRecipe.particles;

    assert.lengthOf(arc.recipeDeltas, 1);
    const [innerArc] = arc.findInnerArcs(transformationParticle);

    const sessionId = innerArc.idGenerator.currentSessionIdForTesting;
    assert.strictEqual(innerArc.activeRecipe.toString(), `recipe
  slot0: slot 'rootslotid-root___!${sessionId}:demo:inner2:slot1'
  slot1: slot '!${sessionId}:demo:inner2:slot2'
  A as particle0
    content: consumes slot0
      detail: provides slot1
  B as particle1
    detail: consumes slot1`,
    'Particle B should consume the detail slot provided by particle A');
  });

});
