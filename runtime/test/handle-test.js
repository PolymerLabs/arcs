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

import {Arc} from '../ts-build/arc.js';
import {assert} from './chai-web.js';
import {SlotComposer} from '../slot-composer.js';
import {handleFor} from '../ts-build/handle.js';
import {Shape} from '../ts-build/shape.js';
import {Type} from '../ts-build/type.js';
import {Manifest} from '../ts-build/manifest.js';
import {Loader} from '../ts-build/loader.js';
import {Schema} from '../ts-build/schema.js';
import {StorageProviderFactory} from '../ts-build/storage/storage-provider-factory.js';

let loader = new Loader();

const createSlotComposer = () => new SlotComposer({rootContainer: 'test', affordance: 'mock'});

describe('Handle', function() {

  let Bar;
  before(() => {
    Bar = new Schema({names: ['Bar'], fields: {id: 'Number', value: 'Text'}}).entityClass();
  });

  it('clear singleton store', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});
    let barStore = await arc.createStore(Bar.type);
    await barStore.set({id: 'an id', value: 'a Bar'});
    await barStore.clear();
    assert.isNull(await barStore.get());
  });

  it('ignores duplicate stores of the same entity value (variable)', async () => {
    // NOTE: Until entity mutation is distinct from collection modification,
    // referenceMode stores *can't* ignore duplicate stores of the same
    // entity value.
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});
    let store = await arc.createStore(Bar.type);
    let version = 0;
    store.on('change', () => version++, {});
    assert.equal(version, 0);
    let bar1 = {id: 'an id', value: 'a Bar'};
    await store.set(bar1);
    assert.equal(version, 1);
    await store.set(bar1);
    // TODO(shans): fix this test once entity mutation is a thing
    assert.equal(version, 2);
    await store.set({value: 'a Bar'});
    assert.equal(version, 3);
  });

  it('ignores duplicate stores of the same entity value (collection)', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});
    let barStore = await arc.createStore(Bar.type.collectionOf());
    let version = 0;
    barStore.on('change', ({add: [{effective}]}) => {if (effective) version++;}, {});
    assert.equal(barStore.version, 0);
    let bar1 = {id: 'an id', value: 'a Bar'};
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
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});

    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);
    let Foo = manifest.schemas.Foo.entityClass();
    let fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()));

    await fooHandle.store(new Foo({value: 'a Foo'}, 'first'));
    await fooHandle.store(new Foo({value: 'another Foo'}, 'second'));
    await fooHandle.store(new Foo({value: 'a Foo, again'}, 'first'));
    assert.lengthOf((await fooHandle.toList()), 2);
  });

  it('allows updates with same user-provided ids but different value (collection)', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});

    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);
    let Foo = manifest.schemas.Foo.entityClass();
    let fooHandle = handleFor(await arc.createStore(Foo.type.collectionOf()));

    await fooHandle.store(new Foo({value: '1'}, 'id1'));
    await fooHandle.store(new Foo({value: '2'}, 'id1'));
    let stored = (await fooHandle.toList())[0];
    assert.equal(stored.value, '2');
  });

  it('allows updates with same user-provided ids but different value (variable)', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});

    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);
    let Foo = manifest.schemas.Foo.entityClass();
    let fooHandle = handleFor(await arc.createStore(Foo.type));

    await fooHandle.set(new Foo({value: '1'}, 'id1'));
    await fooHandle.set(new Foo({value: '2'}, 'id1'));
    let stored = await fooHandle.get();
    assert.equal(stored.value, '2');
  });

  it('remove entry from store', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});
    let barStore = await arc.createStore(Bar.type.collectionOf());
    let bar = new Bar({id: 0, value: 'a Bar'});
    barStore.store(bar, ['key1']);
    barStore.remove(bar.id);
    assert.isEmpty((await barStore.toList()));
  });

  it('can store a particle in a shape store', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});
    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);

    let shape = new Shape('Test', [{type: Type.newEntity(manifest.schemas.Foo)},
                           {type: Type.newEntity(manifest.schemas.Bar)}], []);
    assert(shape.particleMatches(manifest.particles[0]));

    let shapeStore = await arc.createStore(Type.newInterface(shape));
    await shapeStore.set(manifest.particles[0]);
    assert.equal(await shapeStore.get(), manifest.particles[0]);
  });

  it('createHandle only allows valid tags & types in stores', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, id: 'test'});
    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);

    let assert_throws_async = async (f, message) => {
      try {
        await f();
        assert.throws(() => undefined, message);
      } catch (e) {
        assert.throws(() => {throw e;}, message);
      }
    };

    await assert_throws_async(async () => await arc.createStore('not a type'), /isn't a Type/);

    await arc.createStore(Bar.type, 'name', 'id1', '#sufficient');
    await arc.createStore(Bar.type, 'name', 'id2', ['#valid']);
    await arc.createStore(Bar.type, 'name', 'id3', ['#valid', '#good']);
    ['#sufficient', '#valid', '#good'].forEach(tag =>
      assert([...arc.storeTags.values()].find(tags => tags.has(tag)),
        `tags ${arc._tags} should have included ${tag}`));
  });
  it('uses default storage keys', async () => {
    let manifest = await Manifest.parse(`
    schema Bar
      Text value
    `);
    let arc = new Arc({id: 'test', storageKey: 'firebase://xxx.firebaseio.com/yyy/'});
    let resolver;
    let promise = new Promise((resolve, reject) => {resolver = resolve;});
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
    let result = await promise;
    assert.equal(result, 'firebase://xxx.firebaseio.com/yyy/handles/test1');
  });
});
