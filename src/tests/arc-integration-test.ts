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
import {Arc} from '../runtime/arc.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {StubLoader} from '../runtime/testing/stub-loader.js';
import {FakeSlotComposer} from '../runtime/testing/fake-slot-composer.js';

describe('Arc integration', () => {
  it('copies store tags', async () => {
    const loader = new StubLoader({
      'p.js': `defineParticle(({Particle}) => class P extends Particle {
        async setHandles(handles) {
        }
      });`
    });
    const manifest = await Manifest.parse(`
      schema Thing
        name: Text
      particle P in 'p.js'
        thing: reads writes Thing
      recipe
        thingHandle: copy 'mything'
        P
          thing: thingHandle
      resource ThingResource
        start
        [
          {"name": "mything"}
        ]
      store ThingStore of Thing 'mything' #best in ThingResource
    `);

    const runtime = new Runtime(loader, FakeSlotComposer, manifest);
    const arc = runtime.newArc('demo', 'volatile://');
    assert.lengthOf(arc._stores, 0);
    assert.isEmpty(arc.storeTags);

    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    assert.lengthOf(arc._stores, 1);
    assert.strictEqual(1, arc.storeTags.size);
    assert.deepEqual(['best'], [...arc.storeTags.get(arc._stores[0])]);
  });
});
