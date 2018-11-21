// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../test/chai-web.js';
import {StorageProviderFactory} from '../ts-build/storage/storage-provider-factory.js';
import {Type} from '../ts-build/type.js';
import {resetVolatileStorageForTesting} from '../ts-build/storage/volatile-storage.js';
import {assertThrowsAsync} from '../testing/test-util.js';

describe('synthetic storage', function() {
  before(() => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    resetVolatileStorageForTesting();
  });

  function synthKey(targetStore) {
    return `synthetic://arc/handles/${targetStore.storageKey}`;
  }

  function flatten(arcHandle) {
    return `${arcHandle.storageKey} ${arcHandle.type.toString()} <${arcHandle.tags.join(',')}>`;
  }

  it('invalid synthetic keys', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const check = (key, msg) => assertThrowsAsync(() => storage.connect('id1', null, key), msg);

    check('simplistic://arc/handles/target', 'unknown storage protocol');
    check('synthetic://archandles/target', 'invalid synthetic key');
    check('synthetic://arc//target', 'invalid synthetic key');
    check('synthetic://curve/handles/target', 'invalid scope');
    check('synthetic://arc/cranks/target', 'invalid category');
  });

  it('non-existent target key', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = {storageKey: 'volatile://non-existent'};
    const synth = await storage.connect('id1', null, synthKey(targetStore));
    assert.isNull(synth);
  });

  it('invalid manifest', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = await storage.construct('id0', Type.newArcInfo(), 'volatile');
    await targetStore.set({id: 'arc1', serialized: 'bad manifest, no cookie for you'});
    const synth = await storage.connect('id1', null, synthKey(targetStore));
    assert.isEmpty(await synth.toList());
  });

  it('manifest with no active recipe', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = await storage.construct('id0', Type.newArcInfo(), 'volatile');
    await targetStore.set({id: 'arc1', serialized: `
      schema Thing
        Text value`.trim()});

    const synth = await storage.connect('id1', null, synthKey(targetStore));
    assert.isEmpty(await synth.toList());
  });

  it('manifest with no handles', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = await storage.construct('id0', Type.newArcInfo(), 'volatile');
    await targetStore.set({id: 'arc1', serialized: `
      schema Thing
      @active
      recipe
        description \`empty\``.trim()});

    const synth = await storage.connect('id1', null, synthKey(targetStore));
    assert.isEmpty(await synth.toList());
  });

  it('manifest with volatile handles', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = await storage.construct('id0', Type.newArcInfo(), 'volatile');
    await targetStore.set({id: 'arc1', serialized: `
      schema Thing
      resource Store0Resource
        start
        []
      resource Store1_DataResource
        start
        [{"$id":"!461465520498027:demo:0:inner:1:0","value":"sync:null"}]
      resource Store1Resource
        start
        [{"id":"!461465520498027:demo:0:inner:1:0","storageKey":"Store1_Data"}]
      store Store0 of Data {Text value} 'test:0' @0  in Store0Resource
      store Store1_Data of [Data {Text value}] 'Data {Text value}' @1  in Store1_DataResource
      store Store1 of [Data {Text value}] 'test:1' @1  in Store1Resource
      @active
      recipe
        use 'test:0' as handle0 // Data {...}
        use 'test:1' as handle1 // [Data {...}]`.trim()});

    const synth = await storage.connect('id1', null, synthKey(targetStore));
    assert.isEmpty(await synth.toList());
  });

  it('manifest with persistent handles', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = await storage.construct('id0', Type.newArcInfo(), 'volatile');
    await targetStore.set({id: 'arc1', serialized: `
      schema Foo
      schema Bar
      store Store0 of [Foo] at 'firebase://xx.firebaseio.com/yy'
      store Store1 of [Bar] at 'pouchdb://aa.pouchdb.org/bb'
      @active
      recipe
        use Store0 #taggy #waggy as handle0
        use Store1 as handle1`.trim()});

    const synth = await storage.connect('id1', null, synthKey(targetStore));
    synth.on('change', () => assert.fail('change event should not fire for initial value'), {});

    const list = await synth.toList();
    assert.deepEqual(list.map(h => flatten(h)),
        ['firebase://xx.firebaseio.com/yy [Foo {}] <taggy,waggy>',
         'pouchdb://aa.pouchdb.org/bb [Bar {}] <>']);
  });

  it('updates to the target store are propagated', async () => {
    const storage = new StorageProviderFactory('arc-id');
    const targetStore = await storage.construct('id0', Type.newArcInfo(), 'volatile');
    await targetStore.set({id: 'arc1', serialized: `
      schema Foo
      store Store0 of [Foo] at 'firebase://xx.firebaseio.com/yy'
      @active
      recipe
        use Store0 as handle0`.trim()});

    const synth = await storage.connect('id1', null, synthKey(targetStore));
    let list = await synth.toList();
    assert.deepEqual(list.map(h => flatten(h)), ['firebase://xx.firebaseio.com/yy [Foo {}] <>']);

    // We need to wait until the update progresses from the target through to being parsed,
    // and the only way to detect this is the change event fired by the synthetic collection.
    let resolver;
    const eventPromise = new Promise(resolve => resolver = resolve);
    synth.on('change', e => resolver(e), {});

    await targetStore.set({id: 'arc1', serialized: `
      schema Bar
      store Store0 of [Bar] at 'pouchdb://aa.pouchdb.org/bb'
      @active
      recipe
        use Store0 #bars as handle0`.trim()});

    const e = await eventPromise;
    assert.deepEqual(e.add.map(x => flatten(x.value)), ['pouchdb://aa.pouchdb.org/bb [Bar {}] <bars>']);
    assert.deepEqual(e.remove.map(x => flatten(x.value)), ['firebase://xx.firebaseio.com/yy [Foo {}] <>']);

    list = await synth.toList();
    assert.deepEqual(list.map(h => flatten(h)), ['pouchdb://aa.pouchdb.org/bb [Bar {}] <bars>']);
  });
});
