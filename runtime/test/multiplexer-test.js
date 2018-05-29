/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../runtime/test/chai-web.js';

import {Arc} from '../../runtime/arc.js';
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {SlotComposer} from '../../runtime/slot-composer.js';


let loader = new Loader();

describe('Multiplexer', function() {
  it('Processes multiple inputs', async () => {
    let manifest = await Manifest.parse(`
      import 'shell/artifacts/Common/Multiplexer.manifest'
      import 'runtime/test/artifacts/test-particles.manifest'
      
      recipe
        slot 'slotid' as slot0
        use 'test:1' as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0

    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];

    let barType = manifest.findTypeByName('Bar');

    let slotComposer = new SlotComposer({affordance: 'mock', rootContext: 'slotid'});

    let slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (a, b, c, d) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, [a, b, c, d]);
    };

    let arc = new Arc({id: 'test', context: manifest, slotComposer});
    let barStore = await arc.createStore(barType.collectionOf(), null, 'test:1');
    recipe.handles[0].mapToStorage(barStore);
    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);

    await arc.idle;

    await barStore.store({id: 'a', rawData: {value: 'one'}});
    await barStore.store({id: 'b', rawData: {value: 'two'}});
    await barStore.store({id: 'c', rawData: {value: 'three'}});

    await arc.idle;

    assert.equal(slotsCreated, 3);
  });
});
