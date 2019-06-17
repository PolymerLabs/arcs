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
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {assertThrowsAsync} from '../testing/test-util.js';
import {EntityType, InterfaceType} from '../type.js';
import {Id, ArcId, IdGenerator} from '../id.js';
import {floatingPromiseToAudit} from '../util.js';

describe('Handle', () => {
  // Avoid initialising non-POD variables globally, since they would be constructed even when
  // these tests are not going to be executed (i.e. another test file uses 'only').

  // tslint:disable-next-line: variable-name
  let Bar;
  before(() => {
    Bar = new Schema(['Bar'], {id: 'Number', value: 'Text'}).entityClass();
  });

  const manifestFile = './src/runtime/test/artifacts/test-particles.manifest';

  it('clear singleton store', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: ArcId.newForTest('test'), context: undefined, loader: new Loader()});
    const barStore = await arc.createStore(Bar.type) as SingletonStorageProvider;
    await barStore.set({id: 'an id', value: 'a Bar'});
    await barStore.clear();
    assert.isNull(await barStore.get());
  });

  it('ignores duplicate stores of the same entity value (singleton)', async () => {
    // NOTE: Until entity mutation is distinct from collection modification,
    // referenceMode stores *can't* ignore duplicate stores of the same
    // entity value.
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: undefined, loader: new Loader()});
    const store = await arc.createStore(Bar.type) as SingletonStorageProvider;
    let version = 0;
    store.on('change', () => version++, {});
    assert.equal(version, 0);
    const bar1 = {id: 'an id', value: 'a Bar'};
    await store.set(bar1);
    assert.equal(version, 1);
    await store.set(bar1);
    // TODO(shans): fix this test once entity mutation is a thing
    assert.equal(version, 2);
    await store.set({value: 'a Bar'});
    assert.equal(version, 3);
  });

  it('ignores duplicate stores of the same entity value (collection)', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: undefined, loader: new Loader()});
    const barStore = await arc.createStore(Bar.type.collectionOf()) as CollectionStorageProvider;
    let version = 0;
    barStore.on('change', ({add: [{effective}]}) => {if (effective) version++;}, {});
    assert.equal(barStore.version, 0);
    const bar1 = {id: 'an id', value: 'a Bar'};
    await barStore.store(bar1, ['key1']);
    assert.equal(version, 1);
    await barStore.store(bar1, ['key2']);
    assert.equal(version, 1);
    await barStore.store({value: 'a Bar'}, ['key3']);
    assert.equal(version, 2);
    await barStore.store(bar1, ['key4']);
    assert.equal(version, 2);
  });

  it('dedupes common user-provided ids', async () => {
    const manifest = await Manifest.load(manifestFile, new Loader());
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: manifest, loader: new Loader()});

    // tslint:disable-next-line: variable-name
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()), IdGenerator.newSession()) as Collection;

    await fooHandle.store(new Foo({value: 'a Foo'}, 'first'));
    await fooHandle.store(new Foo({value: 'another Foo'}, 'second'));
    await fooHandle.store(new Foo({value: 'a Foo, again'}, 'first'));
    assert.lengthOf((await fooHandle.toList()), 2);
  });

  it('allows updates with same user-provided ids but different value (collection)', async () => {
    const manifest = await Manifest.load(manifestFile, new Loader());
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: manifest, loader: new Loader()});

    // tslint:disable-next-line: variable-name
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()), IdGenerator.newSession()) as Collection;

    await fooHandle.store(new Foo({value: '1'}, 'id1'));
    await fooHandle.store(new Foo({value: '2'}, 'id1'));
    const stored = (await fooHandle.toList())[0];
    assert.equal(stored.value, '2');
  });

  it('allows updates with same user-provided ids but different value (singleton)', async () => {
    const manifest = await Manifest.load(manifestFile, new Loader());
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: manifest, loader: new Loader()});
    // tslint:disable-next-line: variable-name
    const Foo = manifest.schemas.Foo.entityClass();

    const fooHandle = handleFor(await arc.createStore(Foo.type), IdGenerator.newSession()) as Singleton;

    await fooHandle.set(new Foo({value: '1'}, 'id1'));
    await fooHandle.set(new Foo({value: '2'}, 'id1'));
    const stored = await fooHandle.get();
    assert.equal(stored['value'], '2');
  });

  it('remove entry from store', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), loader: new Loader(), context: undefined});
    const barStore = await arc.createStore(Bar.type.collectionOf()) as CollectionStorageProvider;
    const bar = new Bar({id: 0, value: 'a Bar'});
    // TODO: Awaiting these promises causes the test to fail...
    floatingPromiseToAudit(barStore.store(bar, ['key1']));
    floatingPromiseToAudit(barStore.remove(bar.id, ['key1']));
    assert.isEmpty((await barStore.toList()));
  });

  it('can store a particle in an interface store', async () => {
    const manifest = await Manifest.load(manifestFile, new Loader());
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: manifest, loader: new Loader()});

    const iface = InterfaceType.make('Test', [
      {type: new EntityType(manifest.schemas.Foo)},
      {type: new EntityType(manifest.schemas.Bar)}
    ], []);
    assert(iface.interfaceInfo.particleMatches(manifest.particles[0]));

    const ifaceStore = await arc.createStore(iface) as SingletonStorageProvider;
    await ifaceStore.set(manifest.particles[0]);
    assert.equal(await ifaceStore.get(), manifest.particles[0]);
  });

  it('createHandle only allows valid tags & types in stores', async () => {
    const manifest = await Manifest.load(manifestFile, new Loader());
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: Id.fromString('test'), context: manifest, loader: new Loader()});

    // contrived test since this is now caught at compile time
    // tslint:disable-next-line: no-any
    await assertThrowsAsync(async () => await (arc as any)['createStore']('not a type'), /isn't a Type/);

    await arc.createStore(Bar.type, 'name', 'id1', ['#sufficient']);
    await arc.createStore(Bar.type, 'name', 'id2', ['#valid']);
    await arc.createStore(Bar.type, 'name', 'id3', ['#valid', '#good']);
    ['#sufficient', '#valid', '#good'].forEach(tag =>
      assert([...arc.storeTags.values()].find(tags => tags.has(tag)),
        `tags ${arc.storeTags.values()} should have included ${tag}`));
  });
  it('uses default storage keys', async () => {
    const manifest = await Manifest.parse(`
    schema Bar
      Text value
    `);
    const arc = new Arc({id: Id.fromString('test'), storageKey: 'pouchdb://memory/yyy/test', context: manifest, loader: new Loader()});
    const singleton = await arc.createStore(manifest.schemas.Bar.type, 'foo', 'test1') as SingletonStorageProvider;
    assert.equal(singleton.storageKey, 'pouchdb://memory/yyy/test/handles/test1');
  });
});
