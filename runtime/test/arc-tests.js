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

const Arc = require("../arc.js");
const assert = require('chai').assert;
const SlotComposer = require('../slot-composer.js');
const util = require('./test-util.js');
const viewlet = require('../viewlet.js');
const Manifest = require('../manifest.js');


let loader = new (require('../loader'));

async function setup() {
  let manifest = await Manifest.parse(`
    import '../particles/test/test-particles.manifest'
    recipe TestRecipe
      map 'test:1' as view0
      map 'test:2' as view1
      TestParticle
        foo <- view0
        bar -> view1
  `, {loader, fileName: './'});
  return {
    recipe: manifest.recipes[0],
    Foo: manifest.findSchemaByName('Foo').entityClass(),
    Bar: manifest.findSchemaByName('Bar').entityClass(),
  }
}
const slotComposer = new SlotComposer({});

describe('Arc', function() {
  it('applies existing views to a particle', async () => {
    let {recipe, Foo, Bar} = await setup();
    let arc = new Arc({loader, slotComposer, id:'test'});
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);
    viewlet.viewletFor(fooView).set(new Foo({value: 'a Foo'}));
    recipe.normalize();
    arc.instantiate(recipe);
    await util.assertSingletonHas(barView, Bar, "a Foo1");
  });

  it('applies new views to a particle', async () => {
    let {recipe, Foo, Bar} = await setup();
    let arc = new Arc({loader, slotComposer, id:'test'});
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);
    recipe.normalize();
    arc.instantiate(recipe);

    viewlet.viewletFor(fooView).set(new Foo({value: 'a Foo'}));
    await util.assertSingletonHas(barView, Bar, "a Foo1");
  });
});
