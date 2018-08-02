/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {Arc} from '../arc.js';
import {Manifest} from '../manifest.js';
import {Type} from '../type.js';
import {assert} from '../test/chai-web.js';
import {resetInMemoryStorageForTesting} from '../storage/in-memory-storage.js';

// Resolves when the two stores are synchronzied with each other:
// * same version
// * no pending changes
async function synchronized(store1, store2, delay=1) {
  while (store1._hasLocalChanges || store2._hasLocalChanges || store1.versionForTesting != store2.versionForTesting) {
    await new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

describe('in-memory', function() {

  let lastStoreId = 0;
  function newStoreKey(name) {
    return `in-memory`;
  }

  before(() => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    resetInMemoryStorageForTesting();
  });

  describe('variable', () => {
    it('supports basic construct and mutate', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let value = 'Hi there' + Math.random();
      let variable = await storage.construct('test0', BarType, newStoreKey('variable'));
      await variable.set({id: 'test0:test', value});
      let result = await variable.get();
      assert.equal(value, result.value);
    });

    it('resolves concurrent set', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key = newStoreKey('variable');
      let var1 = await storage.construct('test0', BarType, key);
      let var2 = await storage.connect('test0', BarType, var1.storageKey);
      var1.set({id: 'id1', value: 'value1'});
      var2.set({id: 'id2', value: 'value2'});
      await synchronized(var1, var2);
      assert.deepEqual(await var1.get(), await var2.get());
    });

    it('supports pointer dereferences', async () => {
      let manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);

      let arc = new Arc({id: 'test'});
      let storage = new StorageProviderFactory(arc.id);
      let BarType = Type.newEntity(manifest.schemas.Bar);
      let key1 = newStoreKey('variablePointer');
      let key2 = newStoreKey('variableBase');

      let var1 = await storage.construct('test0', Type.newPointer(BarType), key1);
      let var2 = await storage.construct('test1', BarType, key2);
      var1.set({id: 'id1', storageKey: var2.storageKey});
      var2.set({id: 'id2', value: 'underlying'});
      
      let result = await var1.get();
      assert.equal('underlying', result.value);
    });
  });
});
