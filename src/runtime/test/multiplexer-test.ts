/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Id, ArcId} from '../id.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {checkDefined} from '../testing/preconditions.js';
import {CollectionStorageProvider} from '../storage/storage-provider-base.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';

describe('Multiplexer', () => {
  it('Processes multiple inputs', async () => {
    const manifest = await Manifest.parse(`
      import 'src/runtime/test/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/test/artifacts/test-particles.manifest'

      recipe
        slot 'rootslotid-slotid' as slot0
        use 'test:1' as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0
    `, {loader: new Loader(), fileName: ''});

    const recipe = manifest.recipes[0];

    const barType = checkDefined(manifest.findTypeByName('Bar'));

    const slotComposer = new FakeSlotComposer({rootContainer: {'slotid': 'dummy-container'}});

    const slotComposerCreateHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (...args) => {
      slotsCreated++;
      return slotComposerCreateHostedSlot.apply(slotComposer, args);
    };

    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, slotComposer, loader: new Loader()});
    const barStore = await arc.createStore(barType.collectionOf(), null, 'test:1') as CollectionStorageProvider;
    recipe.handles[0].mapToStorage(barStore);
    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);

    await arc.idle;

    await barStore.store({id: 'a', rawData: {value: 'one'}}, ['key1']);
    await barStore.store({id: 'b', rawData: {value: 'two'}}, ['key2']);
    await barStore.store({id: 'c', rawData: {value: 'three'}}, ['key3']);

    await arc.idle;

    assert.equal(slotsCreated, 3);
  });

});
