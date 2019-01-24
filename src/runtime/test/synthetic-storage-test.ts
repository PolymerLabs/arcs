// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/chai-web.js';
import {Id} from '../id.js';
import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {StorageProviderBase, ChangeEvent, CollectionStorageProvider, VariableStorageProvider} from '../storage/storage-provider-base.js';
import {ArcType} from '../type.js';
import {resetVolatileStorageForTesting} from '../storage/volatile-storage.js';
import {assertThrowsAsync} from '../testing/test-util.js';

describe('synthetic storage ', () => {
  before(() => {
    // TODO: perhaps we should do this after the test, and use a unique path for each run instead?
    resetVolatileStorageForTesting();
  });

  async function setup(serialization): Promise<{id: Id, targetStore: VariableStorageProvider, synth: CollectionStorageProvider}> {
    const id = new Id('123', ['test']);
    const storage = new StorageProviderFactory(id);
    const type = new ArcType();
    const key = storage.parseStringAsKey(`volatile://${id}`).childKeyForArcInfo().toString();
    const targetStore = await storage.construct('id0', type, key) as VariableStorageProvider;
    targetStore.referenceMode = false;
    await targetStore.set(type.newInstance(id, serialization.trim()));
    const synth = await storage.connect('id1', null, `synthetic://arc/handles/${key}`) as CollectionStorageProvider;
    return {id, targetStore, synth};
  }

  function flatten(arcHandle) {
    return `${arcHandle.storageKey} ${arcHandle.type.toString()} <${arcHandle.tags.join(',')}>`;
  }

  it('invalid synthetic keys', async () => {
    const storage = new StorageProviderFactory(new Id('123', ['test']));
    const check = (key, msg) => assertThrowsAsync(() => storage.connect('id1', null, key), msg);

    check('simplistic://arc/handles/volatile', 'unknown storage protocol');
    check('synthetic://arc/handles/not-a-protocol://test', 'unknown storage protocol');
    check('synthetic://archandles/volatile', 'invalid synthetic key');
    check('synthetic://arc//volatile', 'invalid synthetic key');
    check('synthetic://curve/handles/volatile://test', 'invalid scope');
    check('synthetic://arc/cranks/volatile://test', 'invalid category');
  });

  it('non-existent target key', async () => {
    const storage = new StorageProviderFactory(new Id('123', ['test']));
    const synth = await storage.connect('id1', null, `synthetic://arc/handles/volatile://nope`);
    assert.isNull(synth);
  });

  it('invalid manifest', async () => {
    const {synth} = await setup('bad manifest, no cookie for you');
    assert.isEmpty(await synth.toList());
  });

  it('manifest with no active recipe', async () => {
    const {synth} = await setup(`
      schema Thing
        Text value`);
    assert.isEmpty(await synth.toList());
  });

  it('manifest with no handles', async () => {
    const {synth} = await setup(`
      schema Thing
      @active
      recipe
        description \`empty\``);
    assert.isEmpty(await synth.toList());
  });

  it('manifest with volatile handles', async () => {
    const {synth} = await setup(`
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
        use 'test:1' as handle1 // [Data {...}]`);
    assert.isEmpty(await synth.toList());
  });

  it('manifest with persistent handles', async () => {
    const {synth} = await setup(`
      schema Foo
      schema Bar
      store Store0 of [Foo] at 'firebase://xx.firebaseio.com/yy'
      store Store1 of [Bar] at 'pouchdb://aa.pouchdb.org/bb'
      @active
      recipe
        use Store0 #taggy #waggy as handle0
        use Store1 as handle1`);

    synth.on('change', () => assert.fail('change event should not fire for initial value'), {});

    const list = await synth.toList();
    assert.deepEqual(list.map(h => flatten(h)),
        ['firebase://xx.firebaseio.com/yy [Foo {}] <taggy,waggy>',
         'pouchdb://aa.pouchdb.org/bb [Bar {}] <>']);
  });

  it('updates to the target store are propagated', async () => {
    const {id, targetStore, synth} = await setup(`
      schema Foo
      store Store0 of [Foo] at 'firebase://xx.firebaseio.com/yy'
      @active
      recipe
        use Store0 as handle0`);

    let list = await synth.toList();
    assert.deepEqual(list.map(h => flatten(h)), ['firebase://xx.firebaseio.com/yy [Foo {}] <>']);

    // We need to wait until the update progresses from the target through to being parsed,
    // and the only way to detect this is the change event fired by the synthetic collection.
    let resolver;
    const eventPromise = new Promise<ChangeEvent>(resolve => resolver = resolve);
    synth.on('change', e => resolver(e), {});

    await targetStore.set(new ArcType().newInstance(id, `
      schema Bar
      store Store0 of [Bar] at 'pouchdb://aa.pouchdb.org/bb'
      @active
      recipe
        use Store0 #bars as handle0`.trim()));

    const e = await eventPromise;
    assert.deepEqual(e.add.map(x => flatten(x.value)), ['pouchdb://aa.pouchdb.org/bb [Bar {}] <bars>']);
    assert.deepEqual(e.remove.map(x => flatten(x.value)), ['firebase://xx.firebaseio.com/yy [Foo {}] <>']);

    list = await synth.toList();
    assert.deepEqual(list.map(h => flatten(h)), ['pouchdb://aa.pouchdb.org/bb [Bar {}] <bars>']);
  });
});
