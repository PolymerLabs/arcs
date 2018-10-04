/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../arc.js';
import {assert} from './chai-web.js';
import {SlotComposer} from '../slot-composer.js';
import * as util from '../testing/test-util.js';
import {handleFor} from '../handle.js';
import {Manifest} from '../manifest.js';
import {Loader} from '../loader.js';
import {TestHelper} from '../testing/test-helper.js';
import {StubLoader} from '../testing/stub-loader.js';
import {MessageChannel} from '../message-channel.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';

let loader = new Loader();

async function setup() {
  let slotComposer = createSlotComposer();
  let arc = new Arc({slotComposer, loader, id: 'test'});
  let manifest = await Manifest.parse(`
    import 'runtime/test/artifacts/test-particles.manifest'
    recipe TestRecipe
      use as handle0
      use as handle1
      TestParticle
        foo <- handle0
        bar -> handle1
  `, {loader, fileName: process.cwd() + '/input.manifest'});
  return {
    arc,
    recipe: manifest.recipes[0],
    Foo: manifest.findSchemaByName('Foo').entityClass(),
    Bar: manifest.findSchemaByName('Bar').entityClass(),
  };
}
function createSlotComposer() { return new SlotComposer({rootContainer: {'root': 'test'}, affordance: 'mock'}); }

describe('Arc', function() {
  it('idle can safely be called multiple times', async () => {
    let slotComposer = createSlotComposer();
    const arc = new Arc({slotComposer, loader, id: 'test'});
    const f = async () => { await arc.idle; };
    await Promise.all([f(), f()]);
  });

  it('applies existing stores to a particle', async () => {
    let {arc, recipe, Foo, Bar} = await setup();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    let barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    await handleFor(fooStore).set(new Foo({value: 'a Foo'}));
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    assert(recipe.normalize());
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('applies new stores to a particle', async () => {
    let {arc, recipe, Foo, Bar} = await setup();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    let barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await handleFor(fooStore).set(new Foo({value: 'a Foo'}));
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    let slotComposer = createSlotComposer();
    let arc = new Arc({slotComposer, loader, id: 'test'});
    let serialization = await arc.serialize();
    let newArc = await Arc.deserialize({serialization, loader, slotComposer});
    assert.equal(newArc._storesById.size, 0);
    assert.equal(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.equal(newArc.id.toStringWithoutSessionForTesting(), 'test');
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    let {arc, recipe, Foo, Bar} = await setup();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    await handleFor(fooStore).set(new Foo({value: 'a Foo'}));
    let barStore = await arc.createStore(Bar.type, undefined, 'test:2', ['tag1', 'tag2']);
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
    assert.equal(fooStore.version, 1);
    assert.equal(barStore.version, 1);

    let serialization = await arc.serialize();
    arc.stop();

    let slotComposer = createSlotComposer();
    let newArc = await Arc.deserialize({serialization, loader, slotComposer});
    fooStore = newArc.findStoreById(fooStore.id);
    barStore = newArc.findStoreById(barStore.id);
    assert.equal(fooStore.version, 1);
    assert.equal(barStore.version, 1);
    assert.lengthOf(newArc.findStoresByType(Bar.type, {tags: ['tag1']}), 1);
  });

  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    let manifest = await Manifest.parse(`
      import 'runtime/test/artifacts/Common/Multiplexer.manifest'
      import 'runtime/test/artifacts/test-particles.manifest'

      recipe
        slot 'rootslotid-slotid' as slot0
        use as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0

    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];

    let slotComposer = new SlotComposer({affordance: 'mock', rootContainer: {'slotid': 'dummy-container'}});

    let slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (a, b, c, d) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, [a, b, c, d]);
    };

    let arc = new Arc({id: 'test', context: manifest, slotComposer});

    let barType = manifest.findTypeByName('Bar');
    let store = await arc.createStore(barType.collectionOf(), undefined, 'test:1');
    recipe.handles[0].mapToStorage(store);

    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;

    let serialization = await arc.serialize();
    arc.stop();

    let newArc = await Arc.deserialize({serialization, loader, slotComposer, fileName: './manifest.manifest'});
    await newArc.idle;
    store = newArc._storesById.get(store.id);
    await store.store({id: 'a', rawData: {value: 'one'}}, ['somekey']);

    await newArc.idle;
    assert.equal(slotsCreated, 1);
  });

  it('copies store tags', async () => {
    let helper = await TestHelper.createAndPlan({
      manifestString: `
      schema Thing
        Text name
      particle P in 'p.js'
        inout Thing thing
      recipe
        copy 'mything' as thingHandle
        P
          thing = thingHandle
      resource ThingResource
        start
        [
          {"name": "mything"}
        ]
      store ThingStore of Thing 'mything' #best in ThingResource
      `,
      loader: new StubLoader({
        'p.js': `defineParticle(({Particle}) => class P extends Particle {
          async setHandles(handles) {
          }
        });`
      }),
      expectedNumPlans: 1
    });

    assert.isEmpty(helper.arc._storesById);
    assert.isEmpty(helper.arc._storeTags);

    await helper.acceptSuggestion({particles: ['P']});

    assert.equal(1, helper.arc._storesById.size);
    assert.equal(1, helper.arc._storeTags.size);
    assert.deepEqual(['best'], [...helper.arc._storeTags.get([...helper.arc._storesById.values()][0])]);
  });

  it('serialization roundtrip preserves data for volatile stores', async function() {
    let loader = new StubLoader({
      manifest: `
        schema Data
          Text value
          Number size

        particle TestParticle in 'a.js'
          in Data var
          out [Data] col
          inout BigCollection<Data> big

        recipe
          use as handle0
          use as handle1
          use as handle2
          TestParticle
            var <- handle0
            col -> handle1
            big = handle2
      `,
      'a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let arc = new Arc({id: 'test', pecFactory, loader});
    let manifest = await Manifest.load('manifest', loader);
    let Data = manifest.findSchemaByName('Data').entityClass();

    let varStore = await arc.createStore(Data.type, undefined, 'test:0');
    let colStore = await arc.createStore(Data.type.collectionOf(), undefined, 'test:1');
    let bigStore = await arc.createStore(Data.type.bigCollectionOf(), undefined, 'test:2');

    // TODO: Reference Mode: Deal With It (TM)
    varStore.referenceMode = false;
    colStore.referenceMode = false;

    // Populate the stores, run the arc and get its serialization.
    // TODO: the serialization roundtrip re-generates keys using the entity ids; we should keep the actual keys
    await handleFor(varStore).set(new Data({value: 'v1'}));
    await colStore.store({id: 'i2', rawData: {value: 'v2', size: 20}}, ['i2']);
    await colStore.store({id: 'i3', rawData: {value: 'v3', size: 30}}, ['i3']);
    await bigStore.store({id: 'i4', rawData: {value: 'v4', size: 40}}, ['i4']);
    await bigStore.store({id: 'i5', rawData: {value: 'v5', size: 50}}, ['i5']);

    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(varStore);
    recipe.handles[1].mapToStorage(colStore);
    recipe.handles[2].mapToStorage(bigStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    let serialization = await arc.serialize();
    arc.stop();
    
    // Grab a snapshot of the current state from each store, then clear them.
    let varData = JSON.parse(JSON.stringify(await varStore.toLiteral()));
    let colData = JSON.parse(JSON.stringify(colStore.toLiteral()));
    let bigData = JSON.parse(JSON.stringify(bigStore.toLiteral()));

    await varStore.clear();
    colStore.clearItemsForTesting();
    bigStore.clearItemsForTesting();

    // Deserialize into a new arc.
    let arc2 = await Arc.deserialize({serialization, pecFactory});
    let varStore2 = arc2.findStoreById(varStore.id);
    let colStore2 = arc2.findStoreById(colStore.id);
    let bigStore2 = arc2.findStoreById(bigStore.id);

    // New storage providers should have been created.
    assert.notStrictEqual(varStore2, varStore);
    assert.notStrictEqual(colStore2, colStore);
    assert.notStrictEqual(bigStore2, bigStore);

    // The old ones should still be cleared.
    assert.isNull(await varStore.get());
    assert.isEmpty(await colStore.toList());
    assert.isEmpty(await bigStore.toLiteral().model);

    // The new ones should be populated from the serialized data.
    assert.deepEqual(await varStore2.toLiteral(), varData);
    assert.deepEqual(colStore2.toLiteral(), colData);
    assert.deepEqual(bigStore2.toLiteral(), bigData);
  });
});
