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
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {RamDiskStorageDriverProvider} from '../runtime/storage/drivers/ramdisk.js';
import {Loader} from '../platform/loader.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';

describe('Arc integration', () => {
  it('copies store tags', async () => {
    const loader = new Loader(null, {
      './p.js': `defineParticle(({Particle}) => class P extends Particle {
        async setHandles(handles) {
        }
      });`
    });
    const runtime = new Runtime({loader});
    const manifest = await runtime.parse(`
      schema Thing
        name: Text
      particle P in './p.js'
        thing: reads writes Thing
      recipe TheRecipe
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
    runtime.context = manifest;

    const arc = await runtime.startArc({arcName: 'demo', planName: 'TheRecipe'});
    await arc.idle;

    assert.lengthOf(arc.stores, 1);
    assert.lengthOf(Object.keys(arc.storeTagsById), 1);
    assert.deepEqual(['best'], [...arc.storeTagsById[arc.stores[0].id]]);
  });
});
