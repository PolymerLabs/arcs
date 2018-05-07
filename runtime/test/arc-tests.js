/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Arc from '../arc.js';
import {assert} from './chai-web.js';
import SlotComposer from '../slot-composer.js';
import * as util from './test-util.js';
import {handleFor} from '../handle.js';
import Manifest from '../manifest.js';
import Loader from '../loader.js';

let loader = new Loader();

async function setup() {
  let arc = new Arc({slotComposer, loader, id: 'test'});
  let manifest = await Manifest.parse(`
    import 'runtime/test/artifacts/test-particles.manifest'
    recipe TestRecipe
      use as view0
      use as view1
      TestParticle
        foo <- view0
        bar -> view1
  `, {loader, fileName: process.cwd() + '/input.manifest'});
  return {
    arc,
    recipe: manifest.recipes[0],
    Foo: manifest.findSchemaByName('Foo').entityClass(),
    Bar: manifest.findSchemaByName('Bar').entityClass(),
  };
}
const slotComposer = new SlotComposer({rootContext: 'test', affordance: 'mock'});

describe('Arc', function() {
  it('applies existing views to a particle', async () => {
    let {arc, recipe, Foo, Bar} = await setup();
    let fooView = await arc.createHandle(Foo.type, undefined, 'test:1');
    let barView = await arc.createHandle(Bar.type, undefined, 'test:2');
    await handleFor(fooView).set(new Foo({value: 'a Foo'}));
    recipe.handles[0].mapToStorage(fooView);
    recipe.handles[1].mapToStorage(barView); 
    assert(recipe.normalize());
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(barView, Bar, 'a Foo1');
  });

  it('applies new views to a particle', async () => {
    let {arc, recipe, Foo, Bar} = await setup();
    let fooView = await arc.createHandle(Foo.type, undefined, 'test:1');
    let barView = await arc.createHandle(Bar.type, undefined, 'test:2');
    recipe.handles[0].mapToStorage(fooView);
    recipe.handles[1].mapToStorage(barView); 
    recipe.normalize();
    await arc.instantiate(recipe);

    handleFor(fooView).set(new Foo({value: 'a Foo'}));
    await util.assertSingletonWillChangeTo(barView, Bar, 'a Foo1');
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    let arc = new Arc({slotComposer, loader, id: 'test'});
    let serialization = await arc.serialize();
    let newArc = await Arc.deserialize({serialization, loader, slotComposer});
    assert(newArc._handlesById.size == 0);
    assert(newArc.activeRecipe.toString() == arc.activeRecipe.toString());
    assert(newArc.id.toStringWithoutSessionForTesting() == 'test');
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    let {arc, recipe, Foo, Bar} = await setup();
    let fooView = await arc.createHandle(Foo.type, undefined, 'test:1');
    handleFor(fooView).set(new Foo({value: 'a Foo'}));
    let barView = await arc.createHandle(Bar.type, undefined, 'test:2');
    recipe.handles[0].mapToStorage(fooView);
    recipe.handles[1].mapToStorage(barView); 
    recipe.normalize();
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(barView, Bar, 'a Foo1');
    assert.equal(fooView._version, 1);
    assert.equal(barView._version, 1);

    let serialization = await arc.serialize();
    arc.stop();

    let newArc = await Arc.deserialize({serialization, loader, slotComposer});
    fooView = newArc.findHandleById(fooView.id);
    barView = newArc.findHandleById(barView.id);
    assert.equal(fooView._version, 1);
    assert.equal(barView._version, 1);
  });

  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    let manifest = await Manifest.parse(`
      import 'shell/artifacts/Common/Multiplexer.manifest'
      import 'runtime/test/artifacts/test-particles.manifest'
      
      recipe
        slot 'slotid' as s0
        use as v0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as s0
          list <- v0

    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];

    let slotComposer = new SlotComposer({affordance: 'mock', rootContext: 'slotid'});

    let slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (a, b, c, d) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, [a, b, c, d]);
    };

    let arc = new Arc({id: 'test', context: manifest, slotComposer});

    let barType = manifest.findTypeByName('Bar');
    let handle = await arc.createHandle(barType.setViewOf(), undefined, 'test:1');
    recipe.handles[0].mapToStorage(handle);
    
    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;

    let serialization = await arc.serialize();
    arc.stop();

    let newArc = await Arc.deserialize({serialization, loader, slotComposer, fileName: './manifest.manifest'});
    await newArc.idle;
    handle = newArc._handlesById.get(handle.id);
    await handle.store({id: 'a', rawData: {value: 'one'}});

    await newArc.idle;
    assert.equal(slotsCreated, 1);
  });
});
