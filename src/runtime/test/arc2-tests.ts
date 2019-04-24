/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import '../storage/firebase/firebase-provider.js';
import '../storage/pouchdb/pouch-db-provider.js';
import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {handleFor, Variable} from '../handle.js';
import {HeadlessSlotDomConsumer} from '../headless-slot-dom-consumer.js';
import {Id, ArcId, IdGenerator} from '../id.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, VariableStorageProvider, StorageProviderBase} from '../storage/storage-provider-base.js';
import {CallbackTracker} from '../testing/callback-tracker.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {StubLoader} from '../testing/stub-loader.js';
import {TestHelper} from '../testing/test-helper.js';
import {assertThrowsAsync} from '../testing/test-util.js';
import * as util from '../testing/test-util.js';
import {ArcType} from '../type.js';

async function setup(storageKeyPrefix: string = 'volatile://') {
  const loader = new Loader();
  const manifest = await Manifest.parse(`
    import 'src/runtime/test/artifacts/test-particles.manifest'
    recipe TestRecipe
      use as handle0
      use as handle1
      TestParticle
        foo <- handle0
        bar -> handle1
  `, {loader, fileName: process.cwd() + '/input.manifest'});
  
  const id = ArcId.newForTest('test');
  const storageKey = storageKeyPrefix + id.toString();
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, id, storageKey, context: manifest});
  return {
    arc,
    recipe: manifest.recipes[0],
    Foo: manifest.findSchemaByName('Foo').entityClass(),
    Bar: manifest.findSchemaByName('Bar').entityClass(),
    loader
  };
}

function getVariableHandle(store: StorageProviderBase): Variable {
  return handleFor(store, IdGenerator.newSession()) as Variable;
}

const testUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/firebase-storage-test/arc-1/';
//['volatile://', 'pouchdb://memory/user-test/', 'pouchdb://local/user-test/'].forEach((storageKeyPrefix) => {
['volatile://', 'pouchdb://memory/user-test/'].forEach((storageKeyPrefix) => {
//[testUrl].forEach((storageKeyPrefix) => {
describe('Arc2 ' + storageKeyPrefix, () => {

  it('applies existing stores to a particle', async () => {
    const {arc, recipe, Foo, Bar} = await setup(storageKeyPrefix);

    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    assert(recipe.normalize());

    await Promise.all([arc.instantiate(recipe),
                       getVariableHandle(fooStore).set(new Foo({value: 'a Foo'})),
                       arc.instantiate(recipe)
    ]);

    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('applies new stores to a particle ', async () => {
    const {arc, recipe, Foo, Bar} = await setup(storageKeyPrefix);
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    
    await getVariableHandle(fooStore).set(new Foo({value: 'a Foo'}));
    console.log('after set');
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });
 });
});
