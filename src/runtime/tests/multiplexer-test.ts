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
import {ArcId} from '../id.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {checkDefined} from '../testing/preconditions.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {collectionHandleForTest} from '../testing/handle-for-test.js';
import {Flags} from '../flags.js';

describe('Multiplexer', () => {
  it('Processes multiple inputs', async () => {
    const manifest = await Manifest.parse(`
      import 'src/runtime/tests/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/tests/artifacts/test-particles.manifest'

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
    const barStore = await arc.createStore(barType.collectionOf(), null, 'test:1');
    const barHandle = await collectionHandleForTest(arc, barStore);
    recipe.handles[0].mapToStorage(barStore);
    assert(recipe.normalize(), 'normalize');
    assert(recipe.isResolved());

    await arc.instantiate(recipe);

    await arc.idle;

    await barHandle.add(new barHandle.entityClass({value: 'one'}));
    await barHandle.add(new barHandle.entityClass({value: 'two'}));
    await barHandle.add(new barHandle.entityClass({value: 'three'}));

    await arc.idle;

    assert.strictEqual(slotsCreated, 3);
  });

  it('SLANDLES Processes multiple inputs', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      import 'src/runtime/tests/artifacts/Common/SLANDLESMultiplexer.arcs'
      import 'src/runtime/tests/artifacts/SLANDLEStest-particles.arcs'

      recipe
        handle0: use 'test:1'
        slot0: \`slot 'rootslotid-slotid'
        SlandleMultiplexer
          hostedParticle: host SlandleConsumerParticle
          annotation: \`consume slot0
          list: in handle0
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
    const barStore = await arc.createStore(barType.collectionOf(), null, 'test:1');
    const barHandle = await collectionHandleForTest(arc, barStore);
    recipe.handles[0].mapToStorage(barStore);
    const options = {errors: new Map()};
    const n = recipe.normalize(options);
    console.log([...options.errors.entries()].map(x => x.map(x => x.toString())));
    assert(n, 'normalizes');
    assert(recipe.isResolved());

    await arc.instantiate(recipe);

    await arc.idle;

    await barHandle.add(new barHandle.entityClass({value: 'one'}));
    await barHandle.add(new barHandle.entityClass({value: 'two'}));
    await barHandle.add(new barHandle.entityClass({value: 'three'}));

    await arc.idle;

    assert.strictEqual(slotsCreated, 3);
  }));

});
