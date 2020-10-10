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
import {DriverFactory} from '../runtime/storage/drivers/driver-factory.js';

describe('Arc integration', () => {
  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('copies store tags', async () => {
    const loader = new Loader(null, {
      'p.js': `defineParticle(({Particle}) => class P extends Particle {
        async setHandles(handles) {
        }
      });`
    });
    const memoryProvider = new TestVolatileMemoryProvider();
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
    `, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    RamDiskStorageDriverProvider.register(memoryProvider);

    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    assert.lengthOf(arc.stores, 0);
    assert.isEmpty(Object.keys(arc.storeTagsById));

    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    assert.lengthOf(arc.stores, 1);
    assert.lengthOf(Object.keys(arc.storeTagsById), 1);
    assert.deepEqual(['best'], [...arc.storeTagsById[arc.stores[0].id]]);
  });
});
