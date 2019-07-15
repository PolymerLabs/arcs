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
import {handleFor, Collection, Singleton} from '../handle.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {Schema} from '../schema.js';
import {CollectionStorageProvider, SingletonStorageProvider} from '../storage/storage-provider-base.js';
import {EntityType, InterfaceType} from '../type.js';
import {Id, ArcId, IdGenerator} from '../id.js';

describe('Handle', () => {

  let loader;
  let manifest;
  before(async () => {
    loader = new Loader();
    manifest = await Manifest.load('./src/runtime/tests/artifacts/test-particles.manifest', loader);
  });

  it('clear singleton store', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});
    const barStore = await arc.createStore(manifest.schemas.Bar.type) as SingletonStorageProvider;
    await barStore.set({id: 'an id', value: 'a Bar'});
    await barStore.clear();
    assert.isNull(await barStore.get());
  });

  it('ignores duplicate stores of the same entity value (singleton)', async () => {
    // NOTE: Until entity mutation is distinct from collection modification,
    // referenceMode stores *can't* ignore duplicate stores of the same
    // entity value.
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});
    const store = await arc.createStore(manifest.schemas.Bar.type) as SingletonStorageProvider;
    let version = 0;
    store.on('change', () => version++, {});
    assert.strictEqual(version, 0);
    const bar1 = {id: 'an id', value: 'a Bar'};
    await store.set(bar1);
    assert.strictEqual(version, 1);
    await store.set(bar1);
    // TODO(shans): fix this test once entity mutation is a thing
    assert.strictEqual(version, 2);
    await store.set({value: 'a Bar'});
    assert.strictEqual(version, 3);
  });

  it('ignores duplicate stores of the same entity value (collection)', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});
    const barStore = await arc.createStore(manifest.schemas.Bar.type.collectionOf()) as CollectionStorageProvider;
    let version = 0;
    barStore.on('change', ({add: [{effective}]}) => {if (effective) version++;}, {});
    assert.strictEqual(barStore.version, 0);
    const bar1 = {id: 'an id', value: 'a Bar'};
    await barStore.store(bar1, ['key1']);
    assert.strictEqual(version, 1);
    await barStore.store(bar1, ['key2']);
    assert.strictEqual(version, 1);
    await barStore.store({value: 'a Bar'}, ['key3']);
    assert.strictEqual(version, 2);
    await barStore.store(bar1, ['key4']);
    assert.strictEqual(version, 2);
  });

  it('dedupes common user-provided ids', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});

    // tslint:disable-next-line: variable-name
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()), IdGenerator.newSession()) as Collection;

    await fooHandle.store(new Foo({value: 'a Foo'}, 'first'));
    await fooHandle.store(new Foo({value: 'another Foo'}, 'second'));
    await fooHandle.store(new Foo({value: 'a Foo, again'}, 'first'));
    assert.lengthOf((await fooHandle.toList()), 2);
  });

  it('allows updates with same user-provided ids but different value (collection)', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});

    // tslint:disable-next-line: variable-name
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()), IdGenerator.newSession()) as Collection;

    await fooHandle.store(new Foo({value: '1'}, 'id1'));
    await fooHandle.store(new Foo({value: '2'}, 'id1'));
    const stored = (await fooHandle.toList())[0];
    assert.strictEqual(stored.value, '2');
  });

  it('allows updates with same user-provided ids but different value (singleton)', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});

    // tslint:disable-next-line: variable-name
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type), IdGenerator.newSession()) as Singleton;

    await fooHandle.set(new Foo({value: '1'}, 'id1'));
    await fooHandle.set(new Foo({value: '2'}, 'id1'));
    const stored = await fooHandle.get();
    assert.strictEqual(stored['value'], '2');
  });

  it('remove entry from store', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});
    const barStore = await arc.createStore(manifest.schemas.Bar.type.collectionOf()) as CollectionStorageProvider;
    const bar = {id: 'an id', value: 'a Bar'};
    await barStore.store(bar, ['key1']);
    await barStore.remove(bar.id, ['key1']);
    assert.isEmpty((await barStore.toList()));
  });

  it('can store a particle in an interface store', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});

    const iface = InterfaceType.make('Test', [
      {type: new EntityType(manifest.schemas.Foo), direction: 'any'},
      {type: new EntityType(manifest.schemas.Bar), direction: 'any'}
    ], []);
    assert(iface.interfaceInfo.particleMatches(manifest.particles[0]));

    const ifaceStore = await arc.createStore(iface) as SingletonStorageProvider;
    await ifaceStore.set(manifest.particles[0]);
    assert.strictEqual(await ifaceStore.get(), manifest.particles[0]);
  });

  it('createHandle only allows valid tags & types in stores', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});

    await arc.createStore(manifest.schemas.Bar.type, 'name', 'id1', ['#sufficient']);
    await arc.createStore(manifest.schemas.Bar.type, 'name', 'id2', ['#valid']);
    await arc.createStore(manifest.schemas.Bar.type, 'name', 'id3', ['#valid', '#good']);
    ['#sufficient', '#valid', '#good'].forEach(tag =>
      assert([...arc.storeTags.values()].find(tags => tags.has(tag)),
        `tags ${arc.storeTags.values()} should have included ${tag}`));
  });

  it('uses default storage keys', async () => {
    const arc = new Arc({id: ArcId.newForTest('test'), storageKey: 'pouchdb://memory/yyy/test',
                         context: manifest, loader});
    const singleton = await arc.createStore(manifest.schemas.Bar.type, 'foo', 'test1') as SingletonStorageProvider;
    assert.strictEqual(singleton.storageKey, 'pouchdb://memory/yyy/test/handles/test1');
  });
});
