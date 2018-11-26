/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../ts-build/arc.js';
import {assert} from './chai-web.js';
import {SlotComposer} from '../ts-build/slot-composer.js';
import * as util from '../testing/test-util.js';
import {handleFor} from '../ts-build/handle.js';
import {Manifest} from '../ts-build/manifest.js';
import {Loader} from '../ts-build/loader.js';
import {TestHelper} from '../testing/test-helper.js';
import {StubLoader} from '../testing/stub-loader.js';

const loader = new Loader();

async function setup() {
  const slotComposer = createSlotComposer();
  const arc = new Arc({slotComposer, loader, id: 'test'});
  const manifest = await Manifest.parse(`
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
function createSlotComposer() { return new SlotComposer({rootContainer: {'root': 'test'}, modality: 'mock'}); }

describe('Arc', function() {
  it('idle can safely be called multiple times', async () => {
    const slotComposer = createSlotComposer();
    const arc = new Arc({slotComposer, loader, id: 'test'});
    const f = async () => { await arc.idle; };
    await Promise.all([f(), f()]);
  });

  it('applies existing stores to a particle', async () => {
    const {arc, recipe, Foo, Bar} = await setup();
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    await handleFor(fooStore).set(new Foo({value: 'a Foo'}));
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    assert(recipe.normalize());
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('applies new stores to a particle', async () => {
    const {arc, recipe, Foo, Bar} = await setup();
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await handleFor(fooStore).set(new Foo({value: 'a Foo'}));
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    const slotComposer = createSlotComposer();
    const arc = new Arc({slotComposer, loader, id: 'test'});
    const serialization = await arc.serialize();
    const newArc = await Arc.deserialize({serialization, loader, slotComposer});
    assert.equal(newArc.storesById.size, 0);
    assert.equal(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.equal(newArc.id.toStringWithoutSessionForTesting(), 'test');
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    const {arc, recipe, Foo, Bar} = await setup();
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

    const serialization = await arc.serialize();
    arc.stop();

    const slotComposer = createSlotComposer();
    const newArc = await Arc.deserialize({serialization, loader, slotComposer});
    fooStore = newArc.findStoreById(fooStore.id);
    barStore = newArc.findStoreById(barStore.id);
    assert.equal(fooStore.version, 1);
    assert.equal(barStore.version, 1);
    assert.lengthOf(newArc.findStoresByType(Bar.type, {tags: ['tag1']}), 1);
  });

  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    const manifest = await Manifest.parse(`
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

    const recipe = manifest.recipes[0];

    const slotComposer = new SlotComposer({modality: 'mock', rootContainer: {'slotid': 'dummy-container'}});

    const slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (a, b, c, d) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, [a, b, c, d]);
    };

    const arc = new Arc({id: 'test', context: manifest, slotComposer});

    const barType = manifest.findTypeByName('Bar');
    let store = await arc.createStore(barType.collectionOf(), undefined, 'test:1');
    recipe.handles[0].mapToStorage(store);

    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;

    const serialization = await arc.serialize();
    arc.stop();

    const newArc = await Arc.deserialize({serialization, loader, slotComposer, fileName: './manifest.manifest'});
    await newArc.idle;
    store = newArc.storesById.get(store.id);
    await store.store({id: 'a', rawData: {value: 'one'}}, ['somekey']);

    await newArc.idle;
    assert.equal(slotsCreated, 1);
  });

  it('copies store tags', async () => {
    const helper = await TestHelper.createAndPlan({
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

    assert.isEmpty(helper.arc.storesById);
    assert.isEmpty(helper.arc.storeTags);

    await helper.acceptSuggestion({particles: ['P']});

    assert.equal(1, helper.arc.storesById.size);
    assert.equal(1, helper.arc.storeTags.size);
    assert.deepEqual(['best'], [...helper.arc.storeTags.get([...helper.arc.storesById.values()][0])]);
  });

  it('serialization roundtrip preserves data for volatile stores', async function() {
    const loader = new StubLoader({
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
    const arc = new Arc({id: 'test', loader});
    const manifest = await Manifest.load('manifest', loader);
    const Data = manifest.findSchemaByName('Data').entityClass();

    const varStore = await arc.createStore(Data.type, undefined, 'test:0');
    const colStore = await arc.createStore(Data.type.collectionOf(), undefined, 'test:1');
    const bigStore = await arc.createStore(Data.type.bigCollectionOf(), undefined, 'test:2');

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

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(varStore);
    recipe.handles[1].mapToStorage(colStore);
    recipe.handles[2].mapToStorage(bigStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    const serialization = await arc.serialize();
    arc.stop();
    
    // Grab a snapshot of the current state from each store, then clear them.
    const varData = JSON.parse(JSON.stringify(await varStore.toLiteral()));
    const colData = JSON.parse(JSON.stringify(colStore.toLiteral()));
    const bigData = JSON.parse(JSON.stringify(bigStore.toLiteral()));

    await varStore.clear();
    colStore.clearItemsForTesting();
    bigStore.clearItemsForTesting();

    // Deserialize into a new arc.
    const arc2 = await Arc.deserialize({serialization});
    const varStore2 = arc2.findStoreById(varStore.id);
    const colStore2 = arc2.findStoreById(colStore.id);
    const bigStore2 = arc2.findStoreById(bigStore.id);

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

  it('serializes immediate value handles correctly', async () => {
    const loader = new StubLoader({
      manifest: `
        shape HostedShape
          in ~a *

        particle A in 'a.js'
          host HostedShape hosts

        particle B in 'b.js'
          in Entity {} val

        recipe
          A
            hosts = B
      `,
      '*': 'defineParticle(({Particle}) => class extends Particle {});',
    });

    const arc = new Arc({id: 'test', loader});
    const manifest = await Manifest.load('manifest', loader);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;

    const serialization = await Manifest.parse(await arc.serialize());
    assert.isEmpty(serialization.stores, 'Immediate value store should not be serialized');
    assert.deepEqual(['A', 'B'], serialization.particles.map(p => p.name),
        'Spec of a particle referenced in an immediate mode should be serialized');
    assert.deepEqual(['HostedShape'], serialization.shapes.map(s => s.name),
        'Hosted connection shape should be serialized');

    const recipeHCs = serialization.recipes[0].handleConnections;
    assert.lengthOf(recipeHCs, 1);
    const [connection] = recipeHCs;
    assert.equal('hosts', connection.name);
    assert.equal('A', connection.particle.spec.name);
    assert.equal('B', connection.handle.immediateValue.name);
  });
});
