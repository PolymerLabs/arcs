/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Loader} from '../../../runtime/loader.js';
import {Arc} from '../../../runtime/arc.js';
import {FakeSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {ArcId} from '../../../runtime/id.js';
import {singletonHandleForTest} from '../../../runtime/testing/handle-for-test.js';

async function createTestHandles(arc: Arc) {
  const connections = arc.activeRecipe.particles[0].connections;
  const createTestHandle = (storeName: string) => singletonHandleForTest(arc, arc.findStoreById(connections[storeName].handle.id));
  return {
    nextMoveStore: await createTestHandle('nextMove'),
    stateStore: await createTestHandle('state'),
    boardResultStore: await createTestHandle('boardResult'),
    messageResultStore: await createTestHandle('messageResult'),
    boardStore: await createTestHandle('board'),
  };
}

describe('TicTacToe MoveApplier tests', () => {
  it('updates boards with valid next moves', async () => {
    const loader = new Loader();
    const manifest = await Manifest.load(`particles/TicTacToe/MoveApplierTest.arcs`, loader);

    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved(), recipe.toString({showUnresolved: true}));
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: ArcId.newForTest('test'),
                         storageKey: 'volatile://test^^123'});
    await arc.instantiate(recipe);
    const {nextMoveStore, stateStore, boardResultStore, messageResultStore, boardStore} = await createTestHandles(arc);

    await stateStore.set(new stateStore.entityClass({state: 0}));

    await boardStore.set(new boardStore.entityClass({
      p00: 0, p01: 0, p02: 0,
      p10: 0, p11: 0, p12: 0,
      p20: 0, p21: 0, p22: 0}));

    await nextMoveStore.set(new nextMoveStore.entityClass({x: 1, y: 1, player: 1}));

    await arc.idle;

    assert.strictEqual((await boardResultStore.get()).p11, 1);
    assert.isNull(await messageResultStore.get());
  });
  it('fails if nextMove and state has player mismatch', async () => {
    const loader = new Loader();
    const manifest = await Manifest.load(`particles/TicTacToe/MoveApplierTest.arcs`, loader);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved(), recipe.toString({showUnresolved: true}));
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: ArcId.newForTest('test'),
                         storageKey: 'volatile://test^^123'});
    await arc.instantiate(recipe);
    const {nextMoveStore, stateStore, boardResultStore, messageResultStore, boardStore} = await createTestHandles(arc);

    await stateStore.set(new stateStore.entityClass({state: 1}));

    await boardStore.set(new boardStore.entityClass({
      p00: 0, p01: 0, p02: 0,
      p10: 0, p11: 0, p12: 0,
      p20: 0, p21: 0, p22: 0}));

    await nextMoveStore.set(new nextMoveStore.entityClass({x: 1, y: 1, player: 1}));

    await arc.idle;
    assert.isNull(await boardResultStore.get());
    assert.strictEqual((await messageResultStore.get()).msg, 'Incorrect player ID: 1 with state 1');
  });
});
