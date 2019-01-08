/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Arc} from '../arc.js';
import {assert} from './chai-web.js';
import {handleFor} from '../handle.js';
import {EntityType, InterfaceType} from '../type.js';
import {Manifest} from '../manifest.js';
import {Loader} from '../loader.js';
import {Schema} from '../schema.js';
import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {assertThrowsAsync} from '../testing/test-util.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';

describe('Handle', function() {
  // Avoid initialising non-POD variables globally, since they would be constructed even when
  // these tests are not going to be executed (i.e. another test file uses 'only').
  let Bar;
  before(() => {
    Bar = new Schema(['Bar'], {id: 'Number', value: 'Text'}).entityClass();
  });

  const manifestFile = './src/runtime/test/artifacts/test-particles.manifest';

  it('clear singleton store', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const barStore = await arc.createStore(Bar.type);
    await barStore.set({id: 'an id', value: 'a Bar'});
    await barStore.clear();
    assert.isNull(await barStore.get());
  });

  it('ignores duplicate stores of the same entity value (variable)', async () => {
    // NOTE: Until entity mutation is distinct from collection modification,
    // referenceMode stores *can't* ignore duplicate stores of the same
    // entity value.
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const store = await arc.createStore(Bar.type);
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
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const barStore = await arc.createStore(Bar.type.collectionOf());
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
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});

    const manifest = await Manifest.load(manifestFile, new Loader());
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()));

    await fooHandle.store(new Foo({value: 'a Foo'}, 'first'));
    await fooHandle.store(new Foo({value: 'another Foo'}, 'second'));
    await fooHandle.store(new Foo({value: 'a Foo, again'}, 'first'));
    assert.lengthOf((await fooHandle.toList()), 2);
  });

  it('allows updates with same user-provided ids but different value (collection)', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});

    const manifest = await Manifest.load(manifestFile, new Loader());
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()));

    await fooHandle.store(new Foo({value: '1'}, 'id1'));
    await fooHandle.store(new Foo({value: '2'}, 'id1'));
    const stored = (await fooHandle.toList())[0];
    assert.equal(stored.value, '2');
  });

  it('allows updates with same user-provided ids but different value (variable)', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});

    const manifest = await Manifest.load(manifestFile, new Loader());
    const Foo = manifest.schemas.Foo.entityClass();
    const fooHandle = handleFor(await arc.createStore(Foo.type));

    await fooHandle.set(new Foo({value: '1'}, 'id1'));
    await fooHandle.set(new Foo({value: '2'}, 'id1'));
    const stored = await fooHandle.get();
    assert.equal(stored.value, '2');
  });

  it('remove entry from store', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const barStore = await arc.createStore(Bar.type.collectionOf());
    const bar = new Bar({id: 0, value: 'a Bar'});
    barStore.store(bar, ['key1']);
    barStore.remove(bar.id);
    assert.isEmpty((await barStore.toList()));
  });

  it('can store a particle in an interface store', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const manifest = await Manifest.load(manifestFile, new Loader());

    const iface = InterfaceType.make('Test', [
      {type: new EntityType(manifest.schemas.Foo)},
      {type: new EntityType(manifest.schemas.Bar)}
    ], []);
    assert(iface.interfaceInfo.particleMatches(manifest.particles[0]));

    const ifaceStore = await arc.createStore(iface);
    await ifaceStore.set(manifest.particles[0]);
    assert.equal(await ifaceStore.get(), manifest.particles[0]);
  });

  it('createHandle only allows valid tags & types in stores', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const manifest = await Manifest.load(manifestFile, new Loader());

    await assertThrowsAsync(async () => await arc.createStore('not a type'), /isn't a Type/);

    await arc.createStore(Bar.type, 'name', 'id1', '#sufficient');
    await arc.createStore(Bar.type, 'name', 'id2', ['#valid']);
    await arc.createStore(Bar.type, 'name', 'id3', ['#valid', '#good']);
    ['#sufficient', '#valid', '#good'].forEach(tag =>
      assert([...arc.storeTags.values()].find(tags => tags.has(tag)),
        `tags ${arc._tags} should have included ${tag}`));
  });
  it('uses default storage keys', async () => {
    const manifest = await Manifest.parse(`
    schema Bar
      Text value
    `);
    const arc = new Arc({id: 'test', storageKey: 'firebase://xxx.firebaseio.com/yyy/'});
    let resolver;
    const promise = new Promise((resolve, reject) => {resolver = resolve;});
    arc.storageProviderFactory = new class extends StorageProviderFactory {
      construct(id, type, keyFragment) {
        resolver(keyFragment);
        return {
          type,
          on() {},
        };
      }
    }(arc.id);
    await arc.createStore(manifest.schemas.Bar.type, 'foo', 'test1');
    const result = await promise;
    assert.equal(result, 'firebase://xxx.firebaseio.com/yyy/handles/test1');
  });
});
