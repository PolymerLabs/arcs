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
import {Id} from '../id.js';
import {ArcType} from '../type.js';
import {assert} from './chai-web.js';
import * as util from '../testing/test-util.js';
import {handleFor} from '../handle.js';
import {Manifest} from '../manifest.js';
import {Loader} from '../loader.js';
import {TestHelper} from '../testing/test-helper.js';
import {StubLoader} from '../testing/stub-loader.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';

async function setup() {
  const loader = new Loader();
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, id: 'test'});
  const manifest = await Manifest.parse(`
    import 'src/runtime/test/artifacts/test-particles.manifest'
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
    loader
  };
}

async function setupWithOptional(cProvided, dProvided) {
  const loader = new Loader();
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, id: 'test'});
  const manifest = await Manifest.parse(`
    schema Thing
      Text value

    particle TestParticle in 'src/runtime/test/artifacts/test-dual-input-particle.js'
      description \`particle a two required handles and two optional handles\`
      in Thing a
        out Thing b
      in? Thing c
        out? Thing d

    recipe TestRecipe
      use as thingA
      use as thingB
      use as maybeThingC
      use as maybeThingD
      TestParticle
        a <- thingA
        b -> thingB
        ${cProvided ? 'c <- maybeThingC' : ''}
        ${dProvided ? 'd -> maybeThingD' : ''}
  `, {loader, fileName: process.cwd() + '/input.manifest'});

  const Thing = manifest.findSchemaByName('Thing').entityClass();
  const aStore = await arc.createStore(Thing.type, 'aStore', 'test:1');
  const bStore = await arc.createStore(Thing.type, 'bStore', 'test:2');
  const cStore = await arc.createStore(Thing.type, 'cStore', 'test:3');
  const dStore = await arc.createStore(Thing.type, 'dStore', 'test:4');

  const recipe = manifest.recipes[0];
  recipe.handles[0].mapToStorage(aStore);
  recipe.handles[1].mapToStorage(bStore);
  recipe.handles[2].mapToStorage(cStore); // These might not be needed?
  recipe.handles[3].mapToStorage(dStore); // These might not be needed?
  recipe.normalize();
  await arc.instantiate(recipe);

  return {arc, recipe, Thing, aStore, bStore, cStore, dStore};
}

async function setupSlandlesWithOptional(cProvided, dProvided) {
  const loader = new Loader();
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, id: 'test'});
  const manifest = await Manifest.parse(`
    particle TestParticle in 'src/runtime/test/artifacts/test-dual-slandle-particle.js'
      description \`particle a two required slandles and two optional slandles\`
      \`consume Slot a
        \`provide Slot b
      \`consume? Slot c
        \`provide? Slot d

    recipe TestRecipe
      use as slotA
      use as slotB
      use as maybeSlotC
      use as maybeSlotD
      TestParticle
        a <- slotA
        b -> slotB
        ${cProvided ? 'c <- maybeSlotC' : ''}
        ${dProvided ? 'd -> maybeSlotD' : ''}
  `, {loader, fileName: process.cwd() + '/input.manifest'});

  const aStore = await arc.createStore(Slot.type, 'aStore', 'test:1');
  const bStore = await arc.createStore(Slot.type, 'bStore', 'test:2');
  const cStore = await arc.createStore(Slot.type, 'cStore', 'test:3');
  const dStore = await arc.createStore(Slot.type, 'dStore', 'test:4');

  const recipe = manifest.recipes[0];
  recipe.handles[0].mapToStorage(aStore);
  recipe.handles[1].mapToStorage(bStore);
  recipe.handles[2].mapToStorage(cStore); // These might not be needed?
  recipe.handles[3].mapToStorage(dStore); // These might not be needed?
  recipe.normalize();
  await arc.instantiate(recipe);

  return {arc, recipe, aStore, bStore, cStore, dStore};
}

describe('Arc', function() {
  it('idle can safely be called multiple times', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader: new Loader(), id: 'test'});
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

  it('optional handles aren\'t required to resolve', async () => {
    const {arc, recipe, Thing, aStore, bStore, cStore, dStore}
      = await setupWithOptional(false, false);

    await handleFor(aStore).set(new Thing({value: 'from_a'}));
    await handleFor(cStore).set(new Thing({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it('optional provided handles aren\'t required to resolve', async () => {
    const {arc, recipe, Thing, aStore, bStore, cStore, dStore}
      = await setupWithOptional(true, false);

    await handleFor(aStore).set(new Thing({value: 'from_a'}));
    await handleFor(cStore).set(new Thing({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it('optional provided handles resolve when provided', async () => {
    const {arc, recipe, Thing, aStore, bStore, cStore, dStore}
      = await setupWithOptional(true, true);

    await handleFor(aStore).set(new Thing({value: 'from_a'}));
    await handleFor(cStore).set(new Thing({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', 'from_c1');
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    const slotComposer = new FakeSlotComposer();
    const loader = new Loader();
    const arc = new Arc({slotComposer, loader, id: 'test'});
    const serialization = await arc.serialize();
    const newArc = await Arc.deserialize({serialization, loader, slotComposer});
    assert.equal(newArc.storesById.size, 0);
    assert.equal(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.equal(newArc.id.toStringWithoutSessionForTesting(), 'test');
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    const {arc, recipe, Foo, Bar, loader} = await setup();
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

    const newArc = await Arc.deserialize({serialization, loader, slotComposer: new FakeSlotComposer()});
    fooStore = newArc.findStoreById(fooStore.id);
    barStore = newArc.findStoreById(barStore.id);
    assert.equal(fooStore.version, 1);
    assert.equal(barStore.version, 1);
    assert.lengthOf(newArc.findStoresByType(Bar.type, {tags: ['tag1']}), 1);
  });

  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    const loader = new Loader();
    const manifest = await TestHelper.parseManifest(`
      import 'src/runtime/test/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/test/artifacts/test-particles.manifest'

      recipe
        slot 'rootslotid-slotid' as slot0
        use as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0

    `, loader);

    const recipe = manifest.recipes[0];

    const slotComposer = new FakeSlotComposer({rootContainer: {'slotid': 'dummy-container'}});

    const slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (...args) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, args);
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
    arc.dispose();

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
    const arc2 = await Arc.deserialize({serialization, loader, fileName: ''});
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
        interface HostedInterface
          in ~a *

        particle A in 'a.js'
          host HostedInterface hosts

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
    assert.deepEqual(['HostedInterface'], serialization.interfaces.map(s => s.name),
        'Hosted connection interface should be serialized');

    const recipeHCs = serialization.recipes[0].handleConnections;
    assert.lengthOf(recipeHCs, 1);
    const [connection] = recipeHCs;
    assert.equal('hosts', connection.name);
    assert.equal('A', connection.particle.spec.name);
    assert.equal('B', connection.handle.immediateValue.name);
  });


  ['volatile://', 'pouchdb://memory/user/'].forEach((storageKeyPrefix) => {
    it('persist serialization for ' + storageKeyPrefix, async () => {
      const id = new Id('123', ['test']).toString();
      const arc = new Arc({id, storageKey: `${storageKeyPrefix}${id}`});
      const manifest = await Manifest.parse(`
      schema Data
        Text value
      recipe
        description \`abc\``);
      const recipe = manifest.recipes[0];
      recipe.normalize();
      await arc.instantiate(recipe);
      const serialization = await arc.serialize();
      await arc.persistSerialization(serialization);

      const key = storageKeyPrefix.includes('volatile')
            ? storageKeyPrefix + '!123:test^^arc-info'
            : storageKeyPrefix + '!123:test/arc-info';


      const store = await arc.storageProviderFactory.connect('id', new ArcType(), key);

      assert.isNotNull(store, 'got a valid store');
      const data = await store.get();

      assert.isNotNull(data, 'got valid data');

      // The serialization tends to have lots of whitespace in it; squash it for easier comparison.
      data.serialization = data.serialization.trim().replace(/[\n ]+/g, ' ');

      const expected = `meta name: '!123:test' storageKey: '${storageKeyPrefix}!123:test' @active recipe description \`abc\``;
      assert.deepEqual({id: '!123:test', serialization: expected}, data);

      // TODO Simulate a cold-load to catch reference mode issues.
      // in the interim you can disable the provider cache in pouch-db-storage.ts
    });
  }); // end forEach storageKeyPrefix
});
