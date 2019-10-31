/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import '../storage/firebase/firebase-provider.js';
import '../storage/pouchdb/pouch-db-provider.js';
import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {HeadlessSlotDomConsumer} from '../headless-slot-dom-consumer.js';
import {Id, ArcId, IdGenerator} from '../id.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, SingletonStorageProvider, StorageProviderBase} from '../storage/storage-provider-base.js';
import {CallbackTracker} from '../testing/callback-tracker.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {StubLoader} from '../testing/stub-loader.js';
import {assertThrowsAsync} from '../testing/test-util.js';
import * as util from '../testing/test-util.js';
import {ArcType, SingletonType} from '../type.js';
import {Runtime} from '../runtime.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';
import {DriverFactory} from '../storageNG/drivers/driver-factory.js';
import {VolatileStorageKey, VolatileDriver} from '../storageNG/drivers/volatile.js';
import {Flags} from '../flags.js';
import {StorageKey} from '../storageNG/storage-key.js';
import {Store} from '../storageNG/store.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';
import {DirectStore} from '../storageNG/direct-store.js';
import {VolatileStorageProvider, VolatileSingleton} from '../storage/volatile-storage.js';
import {singletonHandleForTest, collectionHandleForTest} from '../testing/handle-for-test.js';
import {handleNGFor, SingletonHandle, CollectionHandle} from '../storageNG/handle.js';
import {StorageProxy} from '../storage-proxy.js';
import {StorageProxy as StorageProxyNG} from '../storageNG/storage-proxy.js';
import {Entity} from '../entity.js';
import {RamDiskStorageDriverProvider} from '../storageNG/drivers/ramdisk.js';

async function setup(storageKeyPrefix: string | ((arcId: ArcId) => StorageKey)) {
  const loader = new Loader();
  const manifest = await Manifest.parse(`
    import 'src/runtime/tests/artifacts/test-particles.manifest'
    recipe TestRecipe
      use as handle0
      use as handle1
      TestParticle
        foo <- handle0
        bar -> handle1
  `, {loader, fileName: process.cwd() + '/input.manifest'});
  const runtime = new Runtime(loader, FakeSlotComposer, manifest);
  const arc = runtime.newArc('test', storageKeyPrefix);

  return {
    arc,
    recipe: manifest.recipes[0],
    Foo: manifest.findSchemaByName('Foo').entityClass(),
    Bar: manifest.findSchemaByName('Bar').entityClass(),
    loader
  };
}

// TODO(lindner): add fireBase
//  const testUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/firebase-storage-test/arc-1';

describe('Arc new storage', () => {
  it('preserves data when round-tripping through serialization', Flags.withNewStorageStack(async () => {
    DriverFactory.clearRegistrationsForTesting();
    // TODO(shans): deserialization currently uses a RamDisk store to deserialize into because we don't differentiate
    // between parsing a manifest for public consumption (e.g. with RamDisk resources in it) and parsing a serialized
    // arc (with an @activeRecipe). We'll fix this by adding a 'private' keyword to store serializations which will
    // be used when serializing arcs. Once that is working then the following registration should be removed.
    RamDiskStorageDriverProvider.register();
    const loader = new StubLoader({
      manifest: `
        schema Data
          Text value
          Number size

        particle TestParticle in 'a.js'
          in Data var
          out [Data] col

        recipe
          use as handle0
          use as handle1
          TestParticle
            var <- handle0
            col -> handle1
      `,
      'a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    const manifest = await Manifest.load('manifest', loader);
    const dataClass = manifest.findSchemaByName('Data').entityClass();
    const id = ArcId.fromString('test');
    const storageKey = new VolatileStorageKey(id, 'unique');
    const arc = new Arc({id, storageKey, loader, context: manifest});

    const varStore = await arc.createStore(new SingletonType(dataClass.type), undefined, 'test:0');
    const colStore = await arc.createStore(dataClass.type.collectionOf(), undefined, 'test:1');

    const varStorageProxy = new StorageProxyNG('id', await varStore.activate(), new SingletonType(dataClass.type));
    const varHandle = await handleNGFor('crdt-key', varStorageProxy, arc.idGeneratorForTesting, null, true, true, 'varHandle') as SingletonHandle<Entity>;

    const colStorageProxy = new StorageProxyNG('id-2', await colStore.activate(), dataClass.type.collectionOf());
    const colHandle = await handleNGFor('crdt-key-2', colStorageProxy, arc.idGeneratorForTesting, null, true, true, 'colHandle') as CollectionHandle<Entity>;

    // Populate the stores, run the arc and get its serialization.
    const d1 = new dataClass({value: 'v1'});
    const d2 = new dataClass({value: 'v2', size: 20}, 'i2');
    const d3 = new dataClass({value: 'v3', size: 30}, 'i3');
    await varHandle.set(d1);
    await colHandle.add(d2);
    await colHandle.add(d3);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(varStore);
    recipe.handles[1].mapToStorage(colStore);
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;
    const serialization = await arc.serialize();
    arc.dispose();

    await varHandle.clear();
    await colHandle.clear();

    const arc2 = await Arc.deserialize({serialization, loader, fileName: '', context: manifest});
    const varStore2 = arc2.findStoreById(varStore.id);
    const colStore2 = arc2.findStoreById(colStore.id);

    const varStorageProxy2 = new StorageProxyNG('id', await varStore2.activate(), new SingletonType(dataClass.type));
    const varHandle2 = await handleNGFor('crdt-key', varStorageProxy2, arc.idGeneratorForTesting, null, true, true, 'varHandle') as SingletonHandle<Entity>;

    const colStorageProxy2 = new StorageProxyNG('id-2', await colStore2.activate(), dataClass.type.collectionOf());
    const colHandle2 = await handleNGFor('crdt-key-2', colStorageProxy2, arc.idGeneratorForTesting, null, true, true, 'colHandle') as CollectionHandle<Entity>;

    const varData = await varHandle2.get();
    const colData = await colHandle2.toList();

    assert.deepEqual(varData, d1);
    assert.deepEqual(colData, [d2, d3]);
  }));
});

['volatile://', 'pouchdb://memory/user-test/'].forEach((storageKeyPrefix) => {
describe('Arc ' + storageKeyPrefix, () => {
  it('idle can safely be called multiple times ', async () => {
    const runtime = Runtime.newForNodeTesting();
    const arc = runtime.newArc('test', storageKeyPrefix);
    const f = async () => { await arc.idle; };
    await Promise.all([f(), f()]);
  });

  it('applies existing stores to a particle', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }

    const {arc, recipe, Foo, Bar} = await setup(storageKeyPrefix);
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    await fooHandle.set(new Foo({value: 'a Foo'}));
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    assert(recipe.normalize());
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('applies new stores to a particle ', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }

    const {arc, recipe, Foo, Bar} = await setup(storageKeyPrefix);
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await fooHandle.set(new Foo({value: 'a Foo'}));
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
  });

  it('optional provided handles do not resolve without parent', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }

    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        Text value

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
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
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    const id = ArcId.newForTest('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = manifest.findSchemaByName('Thing').entityClass();
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const cHandle = await singletonHandleForTest(arc, cStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it(`instantiates recipes only if fate is correct ` + storageKeyPrefix, async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }
    const manifest = await Manifest.parse(`
      schema Thing
      particle A in 'a.js'
        in Thing thing
      recipe CopyStoreFromContext // resolved
        copy 'storeInContext' as h0
        A
          thing = h0
      recipe UseStoreFromContext // unresolved
        use 'storeInContext' as h0
        A
          thing = h0
      recipe CopyStoreFromArc // unresolved
        copy 'storeInArc' as h0
        A
          thing = h0
      recipe UseStoreFromArc // resolved
        use 'storeInArc' as h0
        A
          thing = h0
      resource MyThing
        start
        [
        ]
      store ThingStore of Thing 'storeInContext' in MyThing
    `);
    assert.isTrue(manifest.recipes.every(r => r.normalize()));
    assert.isTrue(manifest.recipes[0].isResolved());
    assert.isTrue(manifest.recipes[1].isResolved());

    const loader = new StubLoader({
      'a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    const runtime = new Runtime(loader, FakeSlotComposer, manifest);

    // Successfully instantiates a recipe with 'copy' handle for store in a context.
    await runtime.newArc('test0', storageKeyPrefix).instantiate(manifest.recipes[0]);

    // Fails instantiating a recipe with 'use' handle for store in a context.
    try {
      await runtime.newArc('test1', storageKeyPrefix).instantiate(manifest.recipes[1]);
      assert.fail();
    } catch (e) {
      assert.isTrue(e.toString().includes('store \'storeInContext\' was not found'));
    }

    const arc = await runtime.newArc('test2', storageKeyPrefix);
    const thingClass = manifest.findSchemaByName('Thing').entityClass();
    const thingStore = await arc.createStore(thingClass.type, 'name', 'storeInArc');
    const resolver = new RecipeResolver(arc);

    // Fails resolving a recipe with 'copy' handle for store in the arc (not in context).
    assert.isNull(await resolver.resolve(manifest.recipes[2]));
    const recipe3 = await resolver.resolve(manifest.recipes[3]);
    // Successfully instantiates a recipe with 'use' handle for store in an arc.
    await arc.instantiate(recipe3);
  });

  it('required provided handles do not resolve without parent', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }

    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        Text value

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        in Thing a
          out Thing b
        in? Thing c
          out Thing d

      recipe TestRecipe
        use as thingA
        use as thingB
        use as maybeThingC
        use as maybeThingD
        TestParticle
          a <- thingA
          b -> thingB
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    const id = ArcId.newForTest('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = manifest.findSchemaByName('Thing').entityClass();
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const cHandle = await singletonHandleForTest(arc, cStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));

    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it('optional provided handles cannot resolve without parent', async () => {
    await assertThrowsAsync(async () => {
      const loader = new Loader();
      const manifest = await Manifest.parse(`
        schema Thing
          Text value

        particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
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
            d -> maybeThingD
      `, {loader, fileName: process.cwd() + '/input.manifest'});
      const id = ArcId.newForTest('test');
      const storageKey = storageKeyPrefix + id.toString();
      const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

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
    },
    /.*unresolved handle-connection: parent connection 'c' missing/);
  });

  it('required provided handles cannot resolve without parent', async () =>
    await assertThrowsAsync(async () => {
      const loader = new Loader();
      const manifest = await Manifest.parse(`
        schema Thing
          Text value

        particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
          description \`particle a two required handles and two optional handles\`
          in Thing a
            out Thing b
          in? Thing c
            out Thing d

        recipe TestRecipe
          use as thingA
          use as thingB
          use as maybeThingC
          use as maybeThingD
          TestParticle
            a <- thingA
            b -> thingB
            d -> maybeThingD
      `, {loader, fileName: process.cwd() + '/input.manifest'});

      const id = ArcId.newForTest('test');
      const storageKey = storageKeyPrefix + id.toString();
      const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

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
    },
    /.*unresolved handle-connection: parent connection 'c' missing/)
    );

  it('optional provided handles are not required to resolve with dependencies', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        Text value

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
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
          c <- maybeThingC
    `, {loader, fileName: process.cwd() + '/input.manifest'});
    const id = ArcId.newForTest('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = manifest.findSchemaByName('Thing').entityClass();
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const cHandle = await singletonHandleForTest(arc, cStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await arc.instantiate(recipe);
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', '(null)');
  });

  it('required provided handles must resolve with dependencies', async () =>
    await assertThrowsAsync(async () => {
      const loader = new Loader();
      const manifest = await Manifest.parse(`
        schema Thing
          Text value

        particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
          description \`particle a two required handles and two optional handles\`
          in Thing a
            out Thing b
          in? Thing c
            out Thing d

        recipe TestRecipe
          use as thingA
          use as thingB
          use as maybeThingC
          use as maybeThingD
          TestParticle
            a <- thingA
            b -> thingB
            c <- maybeThingC
      `, {loader, fileName: process.cwd() + '/input.manifest'});
      const id = ArcId.newForTest('test');
      const storageKey = storageKeyPrefix + id.toString();
      const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

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
    },
        /.*unresolved particle: unresolved connections/)
    );

  it('optional provided handles can resolve with parent 1', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }

    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        Text value

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
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
          c <- maybeThingC
          d -> maybeThingD
    `, {loader, fileName: process.cwd() + '/input.manifest'});
    const id = ArcId.newForTest('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = manifest.findSchemaByName('Thing').entityClass();
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const cHandle = await singletonHandleForTest(arc, cStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', 'from_c1');
  });

  it('required provided handles can resolve with parent 2', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        Text value

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        in Thing a
          out Thing b
        in? Thing c
          out Thing d

      recipe TestRecipe
        use as thingA
        use as thingB
        use as maybeThingC
        use as maybeThingD
        TestParticle
          a <- thingA
          b -> thingB
          c <- maybeThingC
          d -> maybeThingD
    `, {loader, fileName: process.cwd() + '/input.manifest'});
    const id = ArcId.newForTest('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = manifest.findSchemaByName('Thing').entityClass();
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const cHandle = await singletonHandleForTest(arc, cStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await util.assertSingletonWillChangeTo(arc, bStore, 'value', 'from_a1');
    await util.assertSingletonWillChangeTo(arc, dStore, 'value', 'from_c1');
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    const slotComposer = new FakeSlotComposer();
    const loader = new Loader();
    const id = Id.fromString('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({slotComposer, loader, id, storageKey, context: undefined});

    const serialization = await arc.serialize();
    const newArc = await Arc.deserialize({serialization, loader, slotComposer, context: undefined, fileName: 'foo.manifest'});
    assert.strictEqual(newArc._stores.length, 0);
    assert.strictEqual(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.strictEqual(newArc.id.idTreeAsString(), 'test');
  });

  it('deserializing a simple serialized arc produces that arc', async function() {
    if (!storageKeyPrefix.startsWith('volatile')) {
      // TODO(lindner): fix pouch/firebase timing
      this.skip();
    }

    const {arc, recipe, Foo, Bar, loader} = await setup(storageKeyPrefix);
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    const fooStoreCallbacks = await CallbackTracker.create(fooStore, 1);

    await fooHandle.set(new Foo({value: 'a Foo'}));
    let barStore = await arc.createStore(Bar.type, undefined, 'test:2', ['tag1', 'tag2']);
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await util.assertSingletonWillChangeTo(arc, barStore, 'value', 'a Foo1');
    assert.strictEqual(fooStore.versionToken, '1');
    assert.strictEqual(barStore.versionToken, '1');
    fooStoreCallbacks.verify();
    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, loader, fileName: '', slotComposer: new FakeSlotComposer(), context: undefined});
    fooStore = newArc.findStoreById(fooStore.id);
    barStore = newArc.findStoreById(barStore.id);
    assert.strictEqual(fooStore.versionToken, '1');
    assert.strictEqual(barStore.versionToken, '1');
    assert.lengthOf(newArc.findStoresByType(Bar.type, {tags: ['tag1']}), 1);
  });

  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import 'src/runtime/tests/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/tests/artifacts/test-particles.manifest'

      recipe
        slot 'rootslotid-slotid' as slot0
        use as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0

    `, {loader, fileName: ''});

    const recipe = manifest.recipes[0];

    const slotComposer = new FakeSlotComposer({rootContainer: {'slotid': 'dummy-container'}});

    const slotComposerCreateHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (...args) => {
      slotsCreated++;
      return slotComposerCreateHostedSlot.apply(slotComposer, args);
    };

    const id = Id.fromString('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({id, storageKey, context: manifest, slotComposer, loader: new Loader()});

    const barType = manifest.findTypeByName('Bar');
    let store = await arc.createStore(barType.collectionOf(), undefined, 'test:1');
    recipe.handles[0].mapToStorage(store);

    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;

    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, loader, slotComposer, fileName: './manifest.manifest', context: manifest});
    await newArc.idle;
    store = newArc.findStoreById(store.id);
    const handle = await collectionHandleForTest(newArc, store);
    await handle.add(new handle.entityClass({value: 'one'}));

    await newArc.idle;
    assert.strictEqual(slotsCreated, 1);
  });

  it('serialization roundtrip preserves data for volatile stores', async function() {
    if (storageKeyPrefix.startsWith('pouchdb')) {
      // pouchdb does not support BigCollection
      this.skip();
    }

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
    const id = Id.fromString('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({id, storageKey, loader, context: manifest});

    const varStore = await arc.createStore(dataClass.type, undefined, 'test:0');
    const colStore = await arc.createStore(dataClass.type.collectionOf(), undefined, 'test:1') as CollectionStorageProvider;
    const bigStore = await arc.createStore(dataClass.type.bigCollectionOf(), undefined, 'test:2') as BigCollectionStorageProvider;
    const varHandle = await singletonHandleForTest(arc, varStore);

    // TODO: Reference Mode: Deal With It (TM)
    varStore.referenceMode = false;
    colStore.referenceMode = false;

    // Populate the stores, run the arc and get its serialization.
    // TODO: the serialization roundtrip re-generates keys using the entity ids; we should keep the actual keys
    await varHandle.set(new dataClass({value: 'v1'}));
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
    const varData = JSON.parse(JSON.stringify(await (await varStore.activate()).serializeContents()));
    const colData = JSON.parse(JSON.stringify(await colStore.serializeContents()));
    const bigData = JSON.parse(JSON.stringify(await bigStore.serializeContents()));

    await varHandle.clear();

    // TODO better casting...
    colStore['clearItemsForTesting']();
    bigStore['clearItemsForTesting']();

    // Deserialize into a new arc.
    const arc2 = await Arc.deserialize({serialization, loader, fileName: '', context: manifest});
    const varStore2 = arc2.findStoreById(varStore.id);
    const colStore2 = arc2.findStoreById(colStore.id) as CollectionStorageProvider;
    const bigStore2 = arc2.findStoreById(bigStore.id) as BigCollectionStorageProvider;

    // New storage providers should have been created.
    assert.notStrictEqual(varStore2, varStore);
    assert.notStrictEqual(colStore2, colStore);
    assert.notStrictEqual(bigStore2, bigStore);

    // The old ones should still be cleared.
    assert.isNull(await varHandle.get());
    assert.isEmpty(await colStore.toList());
    assert.isEmpty((await bigStore.serializeContents()).model);

    // The new ones should be populated from the serialized data.
    assert.deepEqual(await (await varStore2.activate()).serializeContents(), varData);
    assert.deepEqual(await colStore2.serializeContents(), colData);
    assert.deepEqual(await bigStore2.serializeContents(), bigData);
  });

  it('serializes immediate value handles correctly', async () => {
    const loader = new StubLoader({
      manifest: `
        interface HostedInterface
          in ~a *

        particle A in 'a.js'
          host HostedInterface reader

        particle B in 'b.js'
          in Entity {} val

        recipe
          A
            reader = B
      `,
      '*': 'defineParticle(({Particle}) => class extends Particle {});',
    });

    const manifest = await Manifest.load('manifest', loader);
    const id = Id.fromString('test');
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({id, storageKey, loader, context: manifest});
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
    assert.strictEqual('reader', connection.name);
    assert.strictEqual('A', connection.particle.spec.name);
    assert.strictEqual('B', connection.handle.immediateValue.name);
  });


  it('persist serialization for', async () => {
    const id = ArcId.newForTest('test');
    const manifest = await Manifest.parse(`
      schema Data
        Text value
      recipe
        description \`abc\``);
    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({id, storageKey, loader: new Loader(), context: manifest});
    const recipe = manifest.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);
    const serialization = await arc.serialize();
    await arc.persistSerialization(serialization);

    const key = storageKeyPrefix.includes('volatile')
      ? storageKeyPrefix + `${id}^^arc-info`
      : storageKeyPrefix + `${id}/arc-info`;

    const store = await arc.storageProviderFactory.connect('id', new ArcType(), key) as SingletonStorageProvider;
    const callbackTracker = await CallbackTracker.create(store, 0);

    assert.isNotNull(store, 'got a valid store');
    const data = await store.get();
    assert.isNotNull(data, 'got valid data');
    callbackTracker.verify();

    // The serialization tends to have lots of whitespace in it; squash it for easier comparison.
    data.serialization = data.serialization.trim().replace(/[\n ]+/g, ' ');

    const expected = `meta name: '${id}' storageKey: '${storageKeyPrefix}${id}' @active recipe description \`abc\``;
    assert.deepEqual({id: id.toString(), serialization: expected}, data);

    // TODO Simulate a cold-load to catch reference mode issues.
    // in the interim you can disable the provider cache in pouch-db-storage.ts
  });

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

    const slotComposer = new MockSlotComposer({strict: false}).newExpectations('debug');
    const loader = new StubLoader({
      ...sources,
      'Z.js': `defineParticle(({DomParticle}) => {
        return class extends DomParticle {
          getTemplate() { return 'Z'; }
        };
      });`,
    });
    const context = await Manifest.parse(`
        particle A in 'A.js'
          consume root

        recipe
          slot 'rootslotid-root' as root
          A
            consume root as root
    `);
    const arc = new Arc({id: IdGenerator.newSession().newArcId('arcid'),
      storageKey: 'key', loader, slotComposer, context});

    const [recipe] = arc.context.recipes;
    recipe.normalize();
    await arc.instantiate(recipe);

    const rootSlotConsumer = slotComposer.consumers.find(c => !c.arc.isInnerArc) as HeadlessSlotDomConsumer;
    await rootSlotConsumer.contentAvailable;
    assert.strictEqual(rootSlotConsumer._content.template, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('handles serialization/deserialization of empty arcs handles', async () => {
    const id = ArcId.newForTest('test');
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

    const storageKey = storageKeyPrefix + id.toString();
    const arc = new Arc({id, storageKey, loader: new Loader(), context: manifest});
    assert.isNotNull(arc);

    const favoriteFoodClass = manifest.findSchemaByName('FavoriteFood').entityClass();
    assert.isNotNull(favoriteFoodClass);

    const recipe = manifest.recipes[0];
    assert.isNotNull(recipe);

    const foodStore = await arc.createStore(favoriteFoodClass.type.collectionOf(), undefined, 'test:1');
    assert.isNotNull(foodStore);
    recipe.handles[0].mapToStorage(foodStore);

    const favoriteFoodType = manifest.findTypeByName('FavoriteFood');
    assert.isNotNull(favoriteFoodType, 'FavoriteFood type is found');

    const options = {errors: new Map()};
    const normalized = recipe.normalize(options);
    assert(normalized, 'not normalized ' + options.errors);
    assert(recipe.isResolved());
    await arc.instantiate(recipe);

    const serialization = await arc.serialize();

    const slotComposer = new FakeSlotComposer();

    const newArc = await Arc.deserialize({serialization, loader, slotComposer, context: undefined, fileName: 'foo.manifest'});
    assert.strictEqual(newArc._stores.length, 1);
    assert.strictEqual(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.strictEqual(newArc.id.idTreeAsString(), 'test');
  });

  it('registers and deregisters its own volatile storage', async () => {
    const id1 = ArcId.newForTest('test1');
    const id2 = ArcId.newForTest('test2');
    const storageKey1 = storageKeyPrefix + id1.toString();
    const storageKey2 = storageKeyPrefix + id2.toString();

    DriverFactory.clearRegistrationsForTesting();
    assert.isEmpty(DriverFactory.providers);

    const arc1 = new Arc({id: id1, storageKey: storageKey1, loader: new Loader(), context: new Manifest({id: id1})});
    assert.strictEqual(DriverFactory.providers.size, 1);

    const arc2 = new Arc({id: id2, storageKey: storageKey2, loader: new Loader(), context: new Manifest({id: id2})});
    assert.strictEqual(DriverFactory.providers.size, 2);

    arc1.dispose();
    assert.strictEqual(DriverFactory.providers.size, 1);

    arc2.dispose();
    assert.isEmpty(DriverFactory.providers);
  });
});
}); // forEach storageKeyPrefix

describe('Arc storage migration', () => {
  describe('when new storage enabled', () => {
    beforeEach(() => {
      Flags.useNewStorageStack = true;
    });

    afterEach(() => {
      Flags.reset();
    });

    it('supports new StorageKey type', async () => {
      const {arc, Foo} = await setup(arcId => new VolatileStorageKey(arcId, ''));
      const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
      assert.instanceOf(fooStore, Store);
      const activeStore = await fooStore.activate();
      assert.instanceOf(activeStore, DirectStore);
      const directStore = activeStore as DirectStore<CRDTTypeRecord>;
      assert.instanceOf(directStore.driver, VolatileDriver);
    });

    it('rejects old string storage keys', async () => {
      const {arc, Foo} = await setup('volatile://');
      assertThrowsAsync(async () => {
        await arc.createStore(Foo.type, undefined, 'test:1');
      }, `Can't use string storage keys with the new storage stack.`);
    });
  });

  describe('when new storage disabled', () => {
    beforeEach(() => {
      Flags.useNewStorageStack = false;
    });

    afterEach(() => {
      Flags.reset();
    });

    it('supports old string storage keys', async () => {
      const {arc, Foo} = await setup('volatile://');
      const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
      assert.instanceOf(fooStore, StorageProviderBase);
      assert.instanceOf(fooStore, VolatileStorageProvider);
      assert.instanceOf(fooStore, VolatileSingleton);
    });

    it('rejects new StorageKey type', async () => {
      const {arc, Foo} = await setup(arcId => new VolatileStorageKey(arcId, ''));
      assertThrowsAsync(async () => {
        await arc.createStore(Foo.type, undefined, 'test:1');
      }, `Can't use new-style storage keys with the old storage stack.`);
    });
  });
});
