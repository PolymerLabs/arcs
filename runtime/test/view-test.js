/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

import runtime from "../runtime.js";
import Arc from "../arc.js";
import {assert} from './chai-web.js';
import SlotComposer from '../slot-composer.js';

import handle from '../handle.js';

import Shape from '../shape.js';
import Type from '../type.js';

import Manifest from '../manifest.js';
import Loader from '../loader.js';

let loader = new Loader();

const slotComposer = new SlotComposer({rootContext: 'test', affordance: 'mock'});
const Bar = runtime.testing.testEntityClass('Bar');

describe('View', function() {

  it('clear singleton view', async () => {
    let arc = new Arc({slotComposer});
    let barView = arc.createView(Bar.type);
    barView.set(new Bar({value: 'a Bar'}));
    barView.clear();
    assert.equal(barView.get(), undefined);
  });

  it('dedupes common user-provided ids', async() => {
    let arc = new Arc({slotComposer});

    let manifest = await Manifest.load('./particles/test/test-particles.manifest', loader);
    let Foo = manifest.schemas.Foo.entityClass();
    let fooView = handle.handleFor(arc.createView(Foo.type.setViewOf()));
    fooView.entityClass = Foo;

    await fooView.store(new Foo({value: 'a Foo'}, 'first'));
    await fooView.store(new Foo({value: 'another Foo'}, 'second'));
    await fooView.store(new Foo({value: 'a Foo, again'}, 'first'));
    assert.equal((await fooView.toList()).length, 2);
  });

  it('remove entry from view', async () => {
    let arc = new Arc({slotComposer});
    let barView = arc.createView(Bar.type.setViewOf());
    let bar = new Bar({id: 0, value: 'a Bar'});
    barView.store(bar);
    barView.remove(bar.id);
    assert.equal(barView.toList().length, 0);
  });

  it('can store a particle in a shape view', async () => {
    let arc = new Arc({slotComposer});
    let manifest = await Manifest.load('./particles/test/test-particles.manifest', loader);

    let shape = new Shape([{type: Type.newEntity(manifest.schemas.Foo)},
                           {type: Type.newEntity(manifest.schemas.Bar)}], []);
    assert(shape._particleMatches(manifest.particles[0]));

    let shapeView = arc.createView(Type.newInterface(shape));
    shapeView.set(manifest.particles[0]);
    assert(shapeView.get() == manifest.particles[0]);
  });

  it('createView only allows valid tags & types in views', async () => {
    let arc = new Arc({slotComposer});
    let manifest = await Manifest.load('./particles/test/test-particles.manifest', loader);

    assert.throws(() => arc.createView('not a type'), /isn\'t a Type/);
    assert.throws(() => arc.createView(Bar.type, 'name', 'id', 'invalid'),
      /must start/);
    assert.throws(() => arc.createView(Bar.type, 'name', 'id', ['#valid', 'invalid']),
      /must start/);

    arc.createView(Bar.type, 'name', 'id', '#sufficient');
    arc.createView(Bar.type, 'name', 'id', ['#valid']);
    arc.createView(Bar.type, 'name', 'id', ['#valid', '#good']);
    ['#sufficient', '#valid', '#good'].forEach(tag =>
      assert(arc._tags.hasOwnProperty(tag),
        `tags ${arc._tags} should have included ${tag}`));
  });
});
