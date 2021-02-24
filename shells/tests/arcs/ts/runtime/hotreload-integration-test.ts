/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../../build/platform/chai-web.js';
import {Manifest} from '../../../../../build/runtime/manifest.js';
import {Loader} from '../../../../../build/platform/loader.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

describe('Hot Code Reload for JS Particle', async () => {
  it('updates model and template', async () =>{
    const context = await Manifest.parse(`
      particle A in './A.js'
        root: consumes Slot

      recipe HotReloadRecipe
        slot0: slot 'rootslotid-root'
        A
          root: consumes slot0`);
    const loader = new Loader(null, {
      './A.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          get template() { return 'Hello <span>{{name}}</span>, old age: <span>{{age}}</span>'; }

          render() {
            return {name: 'Jack', age: '10'};
          }
        };
      });`
    });
    const runtime = new Runtime({loader, context});
    const arcId = await runtime.allocator.startArc({arcName: 'HotReload', planName: 'HotReloadRecipe'});
    const arc = runtime.getArcById(arcId);

    await arc.idle;

    // TODO(sjmiles): render data no longer captured by slot objects
    //const slotConsumer = slotComposer.consumers[0] as HeadlessSlotDomConsumer;
    //assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '10'});
    //assert.deepStrictEqual(slotConsumer._content.template, `Hello <span>{{name}}</span>, old age: <span>{{age}}</span>`);

    loader.staticMap['./A.js'] = `defineParticle(({UiParticle}) => {
      return class extends UiParticle {
        get template() { return 'Hello <span>{{name}}</span>, new age: <span>{{age}}</span>'; }

        render() {
          return {name: 'Jack', age: '15'};
        }
      };
    });`;
    arc.peh.reload(arc.peh.particles);
    await arc.idle;

    // TODO(sjmiles): render data no longer captured by slot objects
    //assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '15'});
    //assert.deepStrictEqual(slotConsumer._content.template, `Hello <span>{{name}}</span>, new age: <span>{{age}}</span>`);
  });

});
