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

import runtime from '../runtime.js';
import Arc from '../arc.js';
import {assert} from './chai-web.js';
import SlotComposer from '../slot-composer.js';

import handle from '../handle.js';

import Shape from '../shape.js';
import Type from '../type.js';

import Manifest from '../manifest.js';
import Loader from '../loader.js';

import StorageProviderFactory from '../storage/storage-provider-factory.js';

let loader = new Loader();

const slotComposer = new SlotComposer({rootContext: 'test', affordance: 'mock'});
const Bar = runtime.testing.testEntityClass('Bar');

describe('View', function() {

  it('clear singleton view', async () => {
    let arc = new Arc({slotComposer, id: 'test'});
    let barView = await arc.createHandle(Bar.type);
    barView.set(new Bar({value: 'a Bar'}));
    barView.clear();
    assert.equal(await barView.get(), undefined);
  });

  it('ignores duplicate stores of the same entity value (variable)', async () => {
    let arc = new Arc({slotComposer, id: 'test'});
    let handle = await arc.createHandle(Bar.type);
    assert.equal(handle._version, 0);
    let bar1 = {id: 'an id', value: 'a Bar'};
    await handle.set(bar1);
    assert.equal(handle._version, 1);
    await handle.set(bar1);
    assert.equal(handle._version, 1);
    await handle.set({value: 'a Bar'});
    assert.equal(handle._version, 2);
  });

  it('ignores duplicate stores of the same entity value (collection)', async () => {
    let arc = new Arc({slotComposer, id: 'test'});
    let handle = await arc.createHandle(Bar.type.setViewOf());
    assert.equal(handle._version, 0);
    let bar1 = {id: 'an id', value: 'a Bar'};
    await handle.store(bar1);
    assert.equal(handle._version, 1);
    await handle.store(bar1);
    assert.equal(handle._version, 1);
    await handle.store({value: 'a Bar'});
    assert.equal(handle._version, 2);
    await handle.store(bar1);
    assert.equal(handle._version, 2);
  });

  it('dedupes common user-provided ids', async () => {
    let arc = new Arc({slotComposer, id: 'test'});

    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);
    let Foo = manifest.schemas.Foo.entityClass();
    let fooView = handle.handleFor(await arc.createHandle(Foo.type.setViewOf()));
    fooView.entityClass = Foo;

    await fooView.store(new Foo({value: 'a Foo'}, 'first'));
    await fooView.store(new Foo({value: 'another Foo'}, 'second'));
    await fooView.store(new Foo({value: 'a Foo, again'}, 'first'));
    assert.equal((await fooView.toList()).length, 2);
  });

  it('remove entry from view', async () => {
    let arc = new Arc({slotComposer, id: 'test'});
    let barView = await arc.createHandle(Bar.type.setViewOf());
    let bar = new Bar({id: 0, value: 'a Bar'});
    barView.store(bar);
    barView.remove(bar.id);
    assert.equal((await barView.toList()).length, 0);
  });

  it('can store a particle in a shape view', async () => {
    let arc = new Arc({slotComposer, id: 'test'});
    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);

    let shape = new Shape("Test", [{type: Type.newEntity(manifest.schemas.Foo)},
                           {type: Type.newEntity(manifest.schemas.Bar)}], []);
    assert(shape.particleMatches(manifest.particles[0]));

    let shapeView = await arc.createHandle(Type.newInterface(shape));
    shapeView.set(manifest.particles[0]);
    assert(await shapeView.get() == manifest.particles[0]);
  });

  it('createHandle only allows valid tags & types in views', async () => {
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

    await assert_throws_async(async () => await arc.createHandle('not a type'), /isn\'t a Type/);
    await assert_throws_async(async () => await arc.createHandle(Bar.type, 'name', 'id', 'invalid'),
      /must start/);
    await assert_throws_async(async () => await arc.createHandle(Bar.type, 'name', 'id', ['#valid', 'invalid']),
      /must start/);

    await arc.createHandle(Bar.type, 'name', 'id', '#sufficient');
    await arc.createHandle(Bar.type, 'name', 'id', ['#valid']);
    await arc.createHandle(Bar.type, 'name', 'id', ['#valid', '#good']);
    ['#sufficient', '#valid', '#good'].forEach(tag =>
      assert(arc._tags.hasOwnProperty(tag),
        `tags ${arc._tags} should have included ${tag}`));
  });
  it('uses default storage keys', async () => {
    let manifest = await Manifest.parse(`
    schema Bar
      normative
        Text value
    `);
    let arc = new Arc({id: 'test', storageKey: 'firebase://test-firebase-45a3e.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/'});
    let resolver;
    let promise = new Promise((resolve, reject) => {resolver = resolve;});
    arc._storageProviderFactory = new class extends StorageProviderFactory {
      construct(id, type, keyFragment) {
        resolver(keyFragment);
        return {type};
      }
    }(arc.id);
    arc.createHandle(manifest.schemas.Bar.type, 'foo', 'test1');
    let result = await promise;
    assert(result == 'firebase://test-firebase-45a3e.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/handles/test1');
  });
});
