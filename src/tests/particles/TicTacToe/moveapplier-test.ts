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
import {SingletonStorageProvider} from '../../../runtime/storage/storage-provider-base.js';
import * as util from '../../../runtime/testing/test-util.js';

describe('TicTacToe MoveApplier tests', () => {
  it('updates boards with valid next moves', async () => {
    const loader = new Loader();
    const manifest = await Manifest.load(`particles/TicTacToe/MoveApplierTest.recipe`, loader);

    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved(), recipe.toString({showUnresolved: true}));
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: ArcId.newForTest('test'),
                         storageKey: 'volatile://test^^123'});
    await arc.instantiate(recipe);
    const nextMoveStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['nextMove'].handle.id) as SingletonStorageProvider;

    const stateStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['state'].handle.id) as SingletonStorageProvider;

    const boardResultStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['boardResult'].handle.id
    ) as SingletonStorageProvider;
    const messageResultStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['messageResult'].handle.id
    ) as SingletonStorageProvider;

    const boardStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['board'].handle.id
    ) as SingletonStorageProvider;

    await stateStore.set({id: 'startGame', rawData: {state: 0}});

    await boardStore.set({id: 'startBoard', rawData: {
      p00: 0, p01: 0, p02: 0,
      p10: 0, p11: 0, p12: 0,
      p20: 0, p21: 0, p22: 0}});

    await nextMoveStore.set({id: 'id0', rawData: {x: 1, y: 1, player: 1}});

    await util.assertSingletonWillChangeTo(
      arc,
      boardResultStore,
      'p11',
      1);
      await util.assertSingletonWillChangeTo(
      arc,
      messageResultStore,
      'msg',
      '(null)');
  });
  it('fails if nextMove and state has player mismatch', async () => {
    const loader = new Loader();
    const manifest = await Manifest.load(`particles/TicTacToe/MoveApplierTest.recipe`, loader);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved(), recipe.toString({showUnresolved: true}));
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: ArcId.newForTest('test'),
                         storageKey: 'volatile://test^^123'});
    await arc.instantiate(recipe);
    const nextMoveStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['nextMove'].handle.id) as SingletonStorageProvider;

    const stateStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['state'].handle.id) as SingletonStorageProvider;

    const boardResultStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['boardResult'].handle.id
    ) as SingletonStorageProvider;
    const messageResultStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['messageResult'].handle.id
    ) as SingletonStorageProvider;

    const boardStore = arc.findStoreById(
      arc.activeRecipe.particles[0].connections['board'].handle.id
    ) as SingletonStorageProvider;

    await stateStore.set({id: 'startGame', rawData: {state: 1}});

    await boardStore.set({id: 'startBoard', rawData: {
      p00: 0, p01: 0, p02: 0,
      p10: 0, p11: 0, p12: 0,
      p20: 0, p21: 0, p22: 0}});

    await nextMoveStore.set({id: 'id0', rawData: {x: 1, y: 1, player: 1}});

    await util.assertSingletonWillChangeTo(
      arc,
      boardResultStore,
      'p11',
      '(null)');
    await util.assertSingletonWillChangeTo(
      arc,
      messageResultStore,
      'msg',
      'Incorrect player ID: 1 with state 1');
  });
});
