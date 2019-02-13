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
import {handleFor} from '../handle.js';
import {Id} from '../id.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, VariableStorageProvider} from '../storage/storage-provider-base.js';
import {CallbackTracker} from '../testing/callback-tracker.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {MockSlotDomConsumer} from '../testing/mock-slot-dom-consumer.js';
import {StubLoader} from '../testing/stub-loader.js';
import {TestHelper} from '../testing/test-helper.js';
import * as util from '../testing/test-util.js';
import {ArcType} from '../type.js';

async function setup() {
  const loader = new Loader();
  const manifest = await Manifest.parse(`
    import 'src/runtime/test/artifacts/test-particles.manifest'
    recipe TestRecipe
      use as handle0
      use as handle1
      TestParticle
        foo <- handle0
        bar -> handle1
  `, {loader, fileName: process.cwd() + '/input.manifest'});
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, id: 'test', context: manifest});
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
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: 'test'});

  const thingClass = manifest.findSchemaByName('Thing').entityClass();
  const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
  const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
  const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
  const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');

  const recipe = manifest.recipes[0];
  recipe.handles[0].mapToStorage(aStore);
  recipe.handles[1].mapToStorage(bStore);
  recipe.handles[2].mapToStorage(cStore); // These might not be needed?
  recipe.handles[3].mapToStorage(dStore); // These might not be needed?
  recipe.normalize();
  await arc.instantiate(recipe);

  return {arc, recipe, thingClass, aStore, bStore, cStore, dStore};
}

async function setupSlandlesWithOptional(cProvided, dProvided) {
  const loader = new Loader();
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
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, id: 'test', context: manifest});

  const slotType = manifest.findSchemaByName('Slot').entityClass().type;
  const aStore = await arc.createStore(slotType, 'aStore', 'test:1');
  const bStore = await arc.createStore(slotType, 'bStore', 'test:2');
  const cStore = await arc.createStore(slotType, 'cStore', 'test:3');
  const dStore = await arc.createStore(slotType, 'dStore', 'test:4');

  const recipe = manifest.recipes[0];
  recipe.handles[0].mapToStorage(aStore);
  recipe.handles[1].mapToStorage(bStore);
  recipe.handles[2].mapToStorage(cStore); // These might not be needed?
  recipe.handles[3].mapToStorage(dStore); // These might not be needed?
  recipe.normalize();
  await arc.instantiate(recipe);

  return {arc, recipe, aStore, bStore, cStore, dStore};
}

describe('Arc', () => {
  it('idle can safely be called multiple times', async () => {
    const manifest = await Manifest.parse(`
        schema Bar
          Text value
      `);
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader: new Loader(), id: 'test', context: manifest});
    const f = async () => { await arc.idle; };
    await Promise.all([f(), f()]);
  });

  it('applies existing stores to a particle', async () => {
    const {arc, recipe, Foo, Bar} = await setup();
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    // tslint:disable-next-line: no-any
    await handleFor(fooStore as any).set(new Foo({value: 'a Foo'}));
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

    // tslint:disable-next-line: no-any
    await handleFor(fooStore as any).set(new Foo({value: 'a Foo'}));
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('optional handles aren\'t required to resolve', async () => {
    const {arc, recipe, thingClass, aStore, bStore, cStore, dStore}
      = await setupWithOptional(false, false);

    // NOTE: handleFor using incompatible types
    // tslint:disable-next-line: no-any
    await handleFor(aStore as any).set(new thingClass({value: 'from_a'}));
    // tslint:disable-next-line: no-any
    await handleFor(cStore as any).set(new thingClass({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it('optional provided handles aren\'t required to resolve', async () => {
    const {arc, recipe, thingClass, aStore, bStore, cStore, dStore}
      = await setupWithOptional(true, false);

    // tslint:disable-next-line: no-any
    await handleFor(aStore as any).set(new thingClass({value: 'from_a'}));
    // tslint:disable-next-line: no-any
    await handleFor(cStore as any).set(new thingClass({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it('optional provided handles resolve when provided', async () => {
    const {arc, recipe, thingClass, aStore, bStore, cStore, dStore}
      = await setupWithOptional(true, true);

    // tslint:disable-next-line: no-any
    await handleFor(aStore as any).set(new thingClass({value: 'from_a'}));
    // tslint:disable-next-line: no-any
    await handleFor(cStore as any).set(new thingClass({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', 'from_c1');
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    const slotComposer = new FakeSlotComposer();
    const loader = new Loader();
    const arc = new Arc({slotComposer, loader, id: 'test', context: undefined});
    const serialization = await arc.serialize();
    const newArc = await Arc.deserialize({serialization, loader, slotComposer, context: undefined, fileName: 'foo.manifest'});
    assert.equal(newArc._stores.length, 0);
    assert.equal(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.equal(newArc.id.toStringWithoutSessionForTesting(), 'test');
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    const {arc, recipe, Foo, Bar, loader} = await setup();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1') as VariableStorageProvider;
    const fooStoreCallbacks = new CallbackTracker(fooStore, 1);

    // tslint:disable-next-line: no-any
    await handleFor(fooStore as any).set(new Foo({value: 'a Foo'}));
    let barStore = await arc.createStore(Bar.type, undefined, 'test:2', ['tag1', 'tag2']) as VariableStorageProvider;
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
    assert.equal(fooStore.version, 1);
    assert.equal(barStore.version, 1);
    fooStoreCallbacks.verify();
    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, loader, fileName: '', slotComposer: new FakeSlotComposer(), context: undefined});
    fooStore = newArc.findStoreById(fooStore.id) as VariableStorageProvider;
    barStore = newArc.findStoreById(barStore.id) as VariableStorageProvider;
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

    const slotComposerCreateHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (...args) => {
      slotsCreated++;
      return slotComposerCreateHostedSlot.apply(slotComposer, args);
    };

    const arc = new Arc({id: 'test', context: manifest, slotComposer, loader: new Loader()});

    const barType = manifest.findTypeByName('Bar') ;
    let store = await arc.createStore(barType.collectionOf(), undefined, 'test:1') as CollectionStorageProvider;
    recipe.handles[0].mapToStorage(store);

    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;

    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, loader, slotComposer, fileName: './manifest.manifest', context: manifest});
    await newArc.idle;
    store = newArc.findStoreById(store.id) as CollectionStorageProvider;
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

  it('serialization roundtrip preserves data for volatile stores', async () => {
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
    const manifest = await Manifest.load('manifest', loader);
    const dataClass = manifest.findSchemaByName('Data').entityClass();
    const arc = new Arc({id: 'test', loader, context: manifest});

    const varStore = await arc.createStore(dataClass.type, undefined, 'test:0') as VariableStorageProvider;
    const colStore = await arc.createStore(dataClass.type.collectionOf(), undefined, 'test:1') as CollectionStorageProvider;
    const bigStore = await arc.createStore(dataClass.type.bigCollectionOf(), undefined, 'test:2') as BigCollectionStorageProvider;

    // TODO: Reference Mode: Deal With It (TM)
    varStore.referenceMode = false;
    colStore.referenceMode = false;

    // Populate the stores, run the arc and get its serialization.
    // TODO: the serialization roundtrip re-generates keys using the entity ids; we should keep the actual keys
    // tslint:disable-next-line: no-any
    await handleFor(varStore as any).set(new dataClass({value: 'v1'}));
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
    arc.dispose();

    // Grab a snapshot of the current state from each store, then clear them.
    const varData = JSON.parse(JSON.stringify(await varStore.toLiteral()));
    const colData = JSON.parse(JSON.stringify(colStore.toLiteral()));
    const bigData = JSON.parse(JSON.stringify(bigStore.toLiteral()));

    await varStore.clear();

    // TODO better casting...
    colStore['clearItemsForTesting']();
    bigStore['clearItemsForTesting']();

    // Deserialize into a new arc.
    const arc2 = await Arc.deserialize({serialization, loader, fileName: '', context: manifest});
    const varStore2 = arc2.findStoreById(varStore.id) as VariableStorageProvider;
    const colStore2 = arc2.findStoreById(colStore.id) as CollectionStorageProvider;
    const bigStore2 = arc2.findStoreById(bigStore.id) as BigCollectionStorageProvider;

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

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: 'test', loader, context: manifest});
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
      const manifest = await Manifest.parse(`
      schema Data
        Text value
      recipe
        description \`abc\``);
      const arc = new Arc({id, storageKey: `${storageKeyPrefix}${id}`, loader: new Loader(), context: manifest});
      const recipe = manifest.recipes[0];
      recipe.normalize();
      await arc.instantiate(recipe);
      const serialization = await arc.serialize();
      await arc.persistSerialization(serialization);

      const key = storageKeyPrefix.includes('volatile')
            ? storageKeyPrefix + '!123:test^^arc-info'
            : storageKeyPrefix + '!123:test/arc-info';


      const store = await arc.storageProviderFactory.connect('id', new ArcType(), key) as VariableStorageProvider;
      const callbackTracker = new CallbackTracker(store, 0);

      assert.isNotNull(store, 'got a valid store');
      const data = await store.get();
      assert.isNotNull(data, 'got valid data');
      callbackTracker.verify();

      // The serialization tends to have lots of whitespace in it; squash it for easier comparison.
      data.serialization = data.serialization.trim().replace(/[\n ]+/g, ' ');

      const expected = `meta name: '!123:test' storageKey: '${storageKeyPrefix}!123:test' @active recipe description \`abc\``;
      assert.deepEqual({id: '!123:test', serialization: expected}, data);

      // TODO Simulate a cold-load to catch reference mode issues.
      // in the interim you can disable the provider cache in pouch-db-storage.ts
    });
  }); // end forEach storageKeyPrefix

  // Particle A creates an inner arc with a hosted slot and instantiates B connected to that slot.
  // Whatever template is rendered into the hosted slot gets 'A' prepended and is rendered by A.
  //
  // B performs the same thing, but puts C in its inner arc. C puts D etc. The whole affair stops
  // with Z, which just renders 'Z'.
  //
  // As aresult we get 26 arcs in total, the first one is an outer arc and each next is an inner arc
  // of a preceding one. A ends up rendering 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.
  it('handles recursive inner arcs', async () => {
    const sources = {};
    // 'A', 'B', 'C', ..., 'Y'
    for (let current = 'A'; current < 'Z';) {
      const next = String.fromCharCode(current.charCodeAt(0) + 1);
      sources[`${current}.js`] = `defineParticle(({DomParticle}) => {
        return class extends DomParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            innerArc.loadRecipe(\`
              particle ${next} in '${next}.js'
                consume root

              recipe
                slot '\` + hostedSlotId + \`' as hosted
                ${next}
                  consume root as hosted
            \`);
          }

          renderHostedSlot(slotName, hostedSlotId, content) {
            this.setState(content);
          }

          shouldRender() {
            return Boolean(this.state.template);
          }

          getTemplate() {
            return '${current}' + this.state.template;
          }
        };
      });`;
      current = next;
    }

    const {arc, slotComposer} = await TestHelper.create({
      manifestString: `
        particle A in 'A.js'
          consume root

        recipe
          slot 'rootslotid-root' as root
          A
            consume root as root`,
      loader: new StubLoader({
        ...sources,
        'Z.js': `defineParticle(({DomParticle}) => {
          return class extends DomParticle {
            getTemplate() { return 'Z'; }
          };
        });`,
      }),
      slotComposer: new MockSlotComposer({strict: false}).newExpectations('debug')
    });

    const [recipe] = arc.context.recipes;
    recipe.normalize();
    await arc.instantiate(recipe);

    const rootSlotConsumer = slotComposer.consumers.find(c => !c.arc.isInnerArc) as MockSlotDomConsumer;
    await rootSlotConsumer.contentAvailable;
    assert.equal(rootSlotConsumer._content.template, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  ['volatile://', 'pouchdb://memory/user/'].forEach((storageKeyPrefix) => {
    it('handles serialization/deserialization of empty arcs handles ' + storageKeyPrefix, async () => {
      const id = new Id('123', ['test']).toString();
      const loader = new Loader();

      const manifest = await Manifest.parse(`
        schema FavoriteFood
          Text food

        particle FavoriteFoodPicker in 'particles/Profile/source/FavoriteFoodPicker.js'
          inout [FavoriteFood] foods
          description \`select favorite foods\`
            foods \`favorite foods\`

        recipe FavoriteFood
          create #favoriteFoods as foods
          FavoriteFoodPicker
            foods = foods
        `, {loader, fileName: process.cwd() + '/input.manifest'});

      const arc = new Arc({id, storageKey: `${storageKeyPrefix}${id}`, loader: new Loader(), context: manifest});
      assert.isNotNull(arc);

      const favoriteFoodClass = manifest.findSchemaByName('FavoriteFood').entityClass();
      assert.isNotNull(favoriteFoodClass);

      const recipe = manifest.recipes[0];
      assert.isNotNull(recipe);

      const foodStore = await arc.createStore(favoriteFoodClass.type.collectionOf(), undefined, 'test:1') as CollectionStorageProvider;
      assert.isNotNull(foodStore);
      recipe.handles[0].mapToStorage(foodStore);

      const favoriteFoodType = manifest.findTypeByName('FavoriteFood') ;
      assert.isNotNull(favoriteFoodType, 'FavoriteFood type is found');

      const options = {errors: new Map()};
      const normalized = recipe.normalize(options);
      assert(normalized, 'not normalized ' + options.errors);
      assert(recipe.isResolved());
      await arc.instantiate(recipe);

      const serialization = await arc.serialize();

      const slotComposer = new FakeSlotComposer();

      const newArc = await Arc.deserialize({serialization, loader, slotComposer, context: undefined, fileName: 'foo.manifest'});
      assert.equal(newArc._stores.length, 1);
      assert.equal(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
      assert.equal(newArc.id.toStringWithoutSessionForTesting(), 'test');
    });
  });  // end forEach(storageKeyPrefix)
});
