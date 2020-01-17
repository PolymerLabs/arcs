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

import {Id, ArcId, IdGenerator} from '../id.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, SingletonStorageProvider, StorageProviderBase} from '../storage/storage-provider-base.js';
import {CallbackTracker} from '../testing/callback-tracker.js';
import {SlotComposer} from '../slot-composer.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
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
import {singletonHandleForTest, collectionHandleForTest, ramDiskStorageKeyPrefixForTest, volatileStorageKeyPrefixForTest} from '../testing/handle-for-test.js';
import {handleNGFor, SingletonHandle, CollectionHandle} from '../storageNG/handle.js';
import {StorageProxy as StorageProxyNG} from '../storageNG/storage-proxy.js';
import {Entity} from '../entity.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {ReferenceModeStorageKey} from '../storageNG/reference-mode-storage-key.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
// database providers are optional, these tests use these provider(s)
import '../storage/firebase/firebase-provider.js';
import '../storage/pouchdb/pouch-db-provider.js';

async function setup(storageKeyPrefix: string | ((arcId: ArcId) => StorageKey)) {
  const loader = new Loader();
  const memoryProvider = new TestVolatileMemoryProvider();

  const manifest = await Manifest.parse(`
    import 'src/runtime/tests/artifacts/test-particles.manifest'
    recipe TestRecipe
      handle0: use *
      handle1: use *
      TestParticle
        foo: reads handle0
        bar: writes handle1
  `, {loader, memoryProvider, fileName: process.cwd() + '/input.manifest'});
  const runtime = new Runtime({loader, context: manifest, memoryProvider});
  const arc = runtime.newArc('test', storageKeyPrefix);

  return {
    arc,
    context: manifest,
    recipe: manifest.recipes[0],
    Foo: Entity.createEntityClass(manifest.findSchemaByName('Foo'), null),
    Bar: Entity.createEntityClass(manifest.findSchemaByName('Bar'), null),
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
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const loader = new Loader(null, {
      './manifest': `
        schema Data
          value: Text
          size: Number

        particle TestParticle in 'a.js'
          var: reads Data
          col: writes [Data]
          refVar: reads Data

        recipe
          handle0: use *
          handle1: use *
          handle2: use *
          TestParticle
            var: reads handle0
            col: writes handle1
            refVar: reads handle2
      `,
      './a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const dataClass = Entity.createEntityClass(manifest.findSchemaByName('Data'), null);
    const id = ArcId.fromString('test');
    const storageKey = new VolatileStorageKey(id, 'unique');
    const arc = new Arc({id, storageKey, loader, context: manifest});

    const varStore = await arc.createStore(new SingletonType(dataClass.type), undefined, 'test:0');
    const colStore = await arc.createStore(dataClass.type.collectionOf(), undefined, 'test:1');

    const refVarKey  = new ReferenceModeStorageKey(new VolatileStorageKey(id, 'colVar'), new VolatileStorageKey(id, 'refVar'));
    const refVarStore = await arc.createStore(new SingletonType(dataClass.type), undefined, 'test:2', [], refVarKey);

    const varStorageProxy = new StorageProxyNG('id', await varStore.activate(), new SingletonType(dataClass.type), varStore.storageKey.toString());
    const varHandle = await handleNGFor('crdt-key', varStorageProxy, arc.idGeneratorForTesting, null, true, true, 'varHandle') as SingletonHandle<Entity>;

    const colStorageProxy = new StorageProxyNG('id-2', await colStore.activate(), dataClass.type.collectionOf(), colStore.storageKey.toString());
    const colHandle = await handleNGFor('crdt-key-2', colStorageProxy, arc.idGeneratorForTesting, null, true, true, 'colHandle') as CollectionHandle<Entity>;

    const refVarStorageProxy = new StorageProxyNG('id-3', await refVarStore.activate(), new SingletonType(dataClass.type), refVarStore.storageKey.toString());
    const refVarHandle = await handleNGFor('crdt-key-3', refVarStorageProxy, arc.idGeneratorForTesting, null, true, true, 'refVarHandle') as SingletonHandle<Entity>;

    // Populate the stores, run the arc and get its serialization.
    const d1 = new dataClass({value: 'v1'});
    const d2 = new dataClass({value: 'v2', size: 20}, 'i2');
    const d3 = new dataClass({value: 'v3', size: 30}, 'i3');
    const d4 = new dataClass({value: 'v4', size: 10}, 'i4');
    await varHandle.set(d1);
    await colHandle.add(d2);
    await colHandle.add(d3);
    await refVarHandle.set(d4);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(varStore);
    recipe.handles[1].mapToStorage(colStore);
    recipe.handles[2].mapToStorage(refVarStore);
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const serialization = await arc.serialize();
    arc.dispose();

    await varHandle.clear();
    await colHandle.clear();
    await refVarHandle.clear();

    const arc2 = await Arc.deserialize({serialization, loader, fileName: '', context: manifest});
    const varStore2 = arc2.findStoreById(varStore.id);
    const colStore2 = arc2.findStoreById(colStore.id);
    const refVarStore2 = arc2.findStoreById(refVarStore.id);

    const varStorageProxy2 = new StorageProxyNG('id', await varStore2.activate(), new SingletonType(dataClass.type), varStore2.storageKey.toString());
    const varHandle2 = await handleNGFor('crdt-key', varStorageProxy2, arc2.idGeneratorForTesting, null, true, true, 'varHandle') as SingletonHandle<Entity>;
    const varData = await varHandle2.get();

    assert.deepEqual(varData, d1);

    const colStorageProxy2 = new StorageProxyNG('id-2', await colStore2.activate(), dataClass.type.collectionOf(), colStore2.storageKey.toString());
    const colHandle2 = await handleNGFor('crdt-key-2', colStorageProxy2, arc2.idGeneratorForTesting, null, true, true, 'colHandle') as CollectionHandle<Entity>;
    const colData = await colHandle2.toList();

    assert.deepEqual(colData, [d2, d3]);

    const refVarStorageProxy2 = new StorageProxyNG('id-3', await refVarStore2.activate(), new SingletonType(dataClass.type), refVarStore2.storageKey.toString());
    const refVarHandle2 = await handleNGFor('crdt-key-3', refVarStorageProxy2, arc2.idGeneratorForTesting, null, true, true, 'refVarHandle') as SingletonHandle<Entity>;

    const refVarData = await refVarHandle2.get();
    assert.deepEqual(refVarData, d4);
  }));

  it('supports capabilities - storage protocol', Flags.withNewStorageStack(async () => {
    DriverFactory.clearRegistrationsForTesting();
    const loader = new Loader(null, {
      '*': `
        defineParticle(({Particle}) => {
          return class extends Particle {}
        });
    `});
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const manifest = await Manifest.parse(`
      schema Thing
      particle MyParticle in 'MyParticle.js'
        thing: writes Thing
      recipe
        handle0: create tied-to-arc
        MyParticle
          thing: handle0
      `, {loader, memoryProvider, fileName: process.cwd() + '/input.manifest'});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', ramDiskStorageKeyPrefixForTest());
    await arc.instantiate(recipe);
    await arc.idle;

    assert.lengthOf(arc.activeRecipe.handles, 1);
    assert.instanceOf(arc.activeRecipe.handles[0].storageKey, VolatileStorageKey);
    assert.isTrue(
        arc.activeRecipe.handles[0].storageKey.toString().includes(arc.id.toString()));
  }));
});

const doSetup = async () => Flags.useNewStorageStack ? setup(arcId => new VolatileStorageKey(arcId, '')) : setup('volatile://');

describe('Arc', () => {
  it('idle can safely be called multiple times ', async () => {
    const runtime = Runtime.newForNodeTesting();
    const arc = runtime.newArc('test', Flags.useNewStorageStack ? null : 'volatile://');
    const f = async () => { await arc.idle; };
    await Promise.all([f(), f()]);
  });

  it('applies existing stores to a particle', async () => {
    const {arc, recipe, Foo, Bar} = await doSetup();
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    const barHandle = await singletonHandleForTest(arc, barStore);

    await fooHandle.set(new Foo({value: 'a Foo'}));
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    assert(recipe.normalize());
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await barHandle.get(), {value: 'a Foo1'});
  });

  it('applies new stores to a particle ', async () => {
    const {arc, recipe, Foo, Bar} = await doSetup();
    const fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const barStore = await arc.createStore(Bar.type, undefined, 'test:2');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    const barHandle = await singletonHandleForTest(arc, barStore);

    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await fooHandle.set(new Foo({value: 'a Foo'}));
    await arc.idle;
    assert.deepStrictEqual(await barHandle.get(), {value: 'a Foo1'});
  });

  it('optional provided handles do not resolve without parent', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        value: Text

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        a: reads Thing
          b: writes Thing
        c: reads? Thing
          d: writes? Thing

      recipe TestRecipe
        thingA: use *
        thingB: use *
        maybeThingC: use *
        maybeThingD: use *
        TestParticle
          a: reads thingA
          b: writes thingB
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    const id = ArcId.newForTest('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const bHandle = await singletonHandleForTest(arc, bStore);
    const cHandle = await singletonHandleForTest(arc, cStore);
    const dHandle = await singletonHandleForTest(arc, dStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.get(), {value: 'from_a1'});
    assert.isNull(await dHandle.get());
  });

  it('instantiates recipes only if fate is correct', async () => {
    const data = Flags.useNewStorageStack ? '{"root": {"values": {}, "version": {}}, "locations": {}}' : '[]';
    const type = Flags.useNewStorageStack ? '![Thing]' : 'Thing';
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);

    const manifest = await Manifest.parse(`
      schema Thing
      particle A in 'a.js'
        thing: reads Thing
      recipe CopyStoreFromContext // resolved
        h0: copy 'storeInContext'
        A
          thing: h0
      recipe UseStoreFromContext // unresolved
        h0: use 'storeInContext'
        A
          thing: h0
      recipe CopyStoreFromArc // unresolved
        h0: copy 'storeInArc'
        A
          thing: h0
      recipe UseStoreFromArc // resolved
        h0: use 'storeInArc'
        A
          thing: h0
      resource MyThing
        start
        ${data}

      store ThingStore of ${type} 'storeInContext' in MyThing
    `, {memoryProvider});
    assert.isTrue(manifest.recipes.every(r => r.normalize()));
    assert.isTrue(manifest.recipes[0].isResolved());
    assert.isTrue(manifest.recipes[1].isResolved());

    const loader = new Loader(null, {
      'a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    const runtime = new Runtime({loader, context: manifest, memoryProvider});

    // Successfully instantiates a recipe with 'copy' handle for store in a context.
    await runtime.newArc('test0', Flags.useNewStorageStack ? null : 'volatile://').instantiate(manifest.recipes[0]);

    // Fails instantiating a recipe with 'use' handle for store in a context.
    try {
      await runtime.newArc('test1', Flags.useNewStorageStack ? null : 'volatile://').instantiate(manifest.recipes[1]);
      assert.fail();
    } catch (e) {
      assert.isTrue(e.toString().includes('store \'storeInContext\'')); // with "use" fate was not found'));
    }

    const arc = await runtime.newArc('test2', Flags.useNewStorageStack ? null : 'volatile://');
    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    await arc.createStore(thingClass.type, 'name', 'storeInArc');
    console.log(arc.activeRecipe.toString());
    const resolver = new RecipeResolver(arc);

    // Fails resolving a recipe with 'copy' handle for store in the arc (not in context).
    assert.isNull(await resolver.resolve(manifest.recipes[2]));
    const recipe3 = await resolver.resolve(manifest.recipes[3]);
    // Successfully instantiates a recipe with 'use' handle for store in an arc.
    await arc.instantiate(recipe3);
  });

  it('required provided handles do not resolve without parent', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        value: Text

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        a: reads Thing
          b: writes Thing
        c: reads? Thing
          d: writes Thing

      recipe TestRecipe
        thingA: use *
        thingB: use *
        maybeThingC: use *
        maybeThingD: use *
        TestParticle
          a: reads thingA
          b: writes thingB
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    const id = ArcId.newForTest('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const bHandle = await singletonHandleForTest(arc, bStore);
    const cHandle = await singletonHandleForTest(arc, cStore);
    const dHandle = await singletonHandleForTest(arc, dStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.get(), {value: 'from_a1'});
    assert.isNull(await dHandle.get());
  });

  it('optional provided handles cannot resolve without parent', async () => {
    await assertThrowsAsync(async () => {
      const loader = new Loader();
      const manifest = await Manifest.parse(`
        schema Thing
          value: Text

        particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
          description \`particle a two required handles and two optional handles\`
          a: reads Thing
            b: writes Thing
          c: reads? Thing
            d: writes? Thing

        recipe TestRecipe
          thingA: use *
          thingB: use *
          maybeThingC: use *
          maybeThingD: use *
          TestParticle
            a: reads thingA
            b: writes thingB
            d: writes maybeThingD
      `, {loader, fileName: process.cwd() + '/input.manifest'});
      const id = ArcId.newForTest('test');
      const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
      const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

      const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
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
          value: Text

        particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
          description \`particle a two required handles and two optional handles\`
          a: reads Thing
            b: writes Thing
          c: reads? Thing
            d: writes Thing

        recipe TestRecipe
          thingA: use *
          thingB: use *
          maybeThingC: use *
          maybeThingD: use *
          TestParticle
            a: reads thingA
            b: writes thingB
            d: writes maybeThingD
      `, {loader, fileName: process.cwd() + '/input.manifest'});

      const id = ArcId.newForTest('test');
      const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
      const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

      const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
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

  it('optional provided handles are not required to resolve with dependencies', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        value: Text

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        a: reads Thing
          b: writes Thing
        c: reads? Thing
          d: writes? Thing

      recipe TestRecipe
        thingA: use *
        thingB: use *
        maybeThingC: use *
        maybeThingD: use *
        TestParticle
          a: reads thingA
          b: writes thingB
          c: reads maybeThingC
    `, {loader, fileName: process.cwd() + '/input.manifest'});
    const id = ArcId.newForTest('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const bHandle = await singletonHandleForTest(arc, bStore);
    const cHandle = await singletonHandleForTest(arc, cStore);
    const dHandle = await singletonHandleForTest(arc, dStore);

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
    await arc.idle;
    assert.deepStrictEqual(await bHandle.get(), {value: 'from_a1'});
    assert.isNull(await dHandle.get());
  });

  it('required provided handles must resolve with dependencies', async () =>
    await assertThrowsAsync(async () => {
      const loader = new Loader();
      const manifest = await Manifest.parse(`
        schema Thing
          value: Text

        particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
          description \`particle a two required handles and two optional handles\`
          a: reads Thing
            b: writes Thing
          c: reads? Thing
            d: writes Thing

        recipe TestRecipe
          thingA: use *
          thingB: use *
          maybeThingC: use *
          maybeThingD: use *
          TestParticle
            a: reads thingA
            b: writes thingB
            c: reads maybeThingC
      `, {loader, fileName: process.cwd() + '/input.manifest'});
      const id = ArcId.newForTest('test');
      const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
      const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

      const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
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

  it('optional provided handles can resolve with parent 1', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        value: Text

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        a: reads Thing
          b: writes Thing
        c: reads? Thing
          d: writes? Thing

      recipe TestRecipe
        thingA: use *
        thingB: use *
        maybeThingC: use *
        maybeThingD: use *
        TestParticle
          a: reads thingA
          b: writes thingB
          c: reads maybeThingC
          d: writes maybeThingD
    `, {loader, fileName: process.cwd() + '/input.manifest'});
    const id = ArcId.newForTest('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const bHandle = await singletonHandleForTest(arc, bStore);
    const cHandle = await singletonHandleForTest(arc, cStore);
    const dHandle = await singletonHandleForTest(arc, dStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.get(), {value: 'from_a1'});
    assert.deepStrictEqual(await dHandle.get(), {value: 'from_c1'});
  });

  it('required provided handles can resolve with parent 2', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Thing
        value: Text

      particle TestParticle in 'src/runtime/tests/artifacts/test-dual-input-particle.js'
        description \`particle a two required handles and two optional handles\`
        a: reads Thing
          b: writes Thing
        c: reads? Thing
          d: writes Thing

      recipe TestRecipe
        thingA: use *
        thingB: use *
        maybeThingC: use *
        maybeThingD: use *
        TestParticle
          a: reads thingA
          b: writes thingB
          c: reads maybeThingC
          d: writes maybeThingD
    `, {loader, fileName: process.cwd() + '/input.manifest'});
    const id = ArcId.newForTest('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const arc = new Arc({slotComposer: new SlotComposer(), loader, context: manifest, id, storageKey});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(thingClass.type, 'aStore', 'test:1');
    const bStore = await arc.createStore(thingClass.type, 'bStore', 'test:2');
    const cStore = await arc.createStore(thingClass.type, 'cStore', 'test:3');
    const dStore = await arc.createStore(thingClass.type, 'dStore', 'test:4');
    const aHandle = await singletonHandleForTest(arc, aStore);
    const bHandle = await singletonHandleForTest(arc, bStore);
    const cHandle = await singletonHandleForTest(arc, cStore);
    const dHandle = await singletonHandleForTest(arc, dStore);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    recipe.normalize();
    await arc.instantiate(recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.get(), {value: 'from_a1'});
    assert.deepStrictEqual(await dHandle.get(), {value: 'from_c1'});
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    const slotComposer = new SlotComposer();
    const loader = new Loader();
    const id = Id.fromString('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const context = new Manifest({id});
    const arc = new Arc({slotComposer, loader, id, storageKey, context});
    await arc.idle;

    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, loader, slotComposer, context, fileName: 'foo.manifest'});
    await newArc.idle;
    assert.strictEqual(newArc._stores.length, 0);
    assert.strictEqual(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.strictEqual(newArc.id.idTreeAsString(), 'test');
    newArc.dispose();
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    const {arc, context, recipe, Foo, Bar, loader} = await  doSetup();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    const fooStoreCallbacks = await CallbackTracker.create(fooStore, 1);
    await fooHandle.set(new Foo({value: 'a Foo'}));

    let barStore = await arc.createStore(Bar.type, undefined, 'test:2', ['tag1', 'tag2']);
    const barHandle = await singletonHandleForTest(arc, barStore);

    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    assert.deepStrictEqual(await barHandle.get(), {value: 'a Foo1'});
    fooStoreCallbacks.verify();
    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, loader, fileName: '', slotComposer: new SlotComposer(), context});
    await newArc.idle;
    fooStore = newArc.findStoreById(fooStore.id);
    barStore = newArc.findStoreById(barStore.id);
    assert(fooStore);
    assert(barStore);
    assert.lengthOf(newArc.findStoresByType(Bar.type, {tags: ['tag1']}), 1);
  });

  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import 'src/runtime/tests/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/tests/artifacts/test-particles.manifest'

      recipe
        slot0: slot 'rootslotid-slotid'
        handle0: use *
        Multiplexer
          hostedParticle: ConsumerParticle
          annotation: consumes slot0
          list: reads handle0

    `, {loader, fileName: ''});

    const recipe = manifest.recipes[0];
    const slotComposer = new SlotComposer();
    const id = Id.fromString('test2');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
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

    //assert.strictEqual(slotComposer.slotsCreated, 1);
  });

  it('serialization roundtrip preserves data for volatile stores', async function() {
    if (Flags.useNewStorageStack) {
      this.skip();
    }
    const loader = new Loader(null, {
      './manifest': `
        schema Data
          value: Text
          size: Number

        particle TestParticle in 'a.js'
          var: reads Data
          col: writes [Data]
          big: reads writes BigCollection<Data>

        recipe
          handle0: use *
          handle1: use *
          handle2: use *
          TestParticle
            var: reads handle0
            col: writes handle1
            big: handle2
      `,
      './a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    const manifest = await Manifest.load('./manifest', loader);
    const dataClass = Entity.createEntityClass(manifest.findSchemaByName('Data'), null);
    const id = Id.fromString('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
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
    const loader = new Loader(null, {
      './manifest': `
        interface HostedInterface
          reads ~a

        particle A in 'a.js'
          reader: hosts HostedInterface

        particle B in 'b.js'
          val: reads Entity {}

        recipe
          A
            reader: B
      `,
      '*': 'defineParticle(({Particle}) => class extends Particle {});',
    });

    const manifest = await Manifest.load('./manifest', loader);
    const id = Id.fromString('test');
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
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


  it('persist serialization for', async function() {
    if (Flags.useNewStorageStack) {
      // We don't currently support ArcInfo through the new stack
      this.skip();
    }
    const id = ArcId.newForTest('test');
    const manifest = await Manifest.parse(`
      schema Data
        value: Text
      recipe
        description \`abc\``);
    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, ''): 'volatile://' + id.toString();
    const arc = new Arc({id, storageKey, loader: new Loader(), context: manifest});
    const recipe = manifest.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);
    const serialization = await arc.serialize();
    await arc.persistSerialization(serialization);

    const key = 'volatile://' + `${id}^^arc-info`;
    const store = await arc.storageProviderFactory.connect('id', new ArcType(), key) as SingletonStorageProvider;

    const callbackTracker = await CallbackTracker.create(store, 0);

    assert.isNotNull(store, 'got a valid store');
    const data = await store.get();
    assert.isNotNull(data, 'got valid data');
    callbackTracker.verify();

    // The serialization tends to have lots of whitespace in it; squash it for easier comparison.
    data.serialization = data.serialization.trim().replace(/[\n ]+/g, ' ');

    const expected = `meta name: '${id}' storageKey: 'volatile://${id}' @active recipe description \`abc\``;
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
      sources[`${current}.js`] = `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            innerArc.loadRecipe(\`
              particle ${next} in '${next}.js'
                root: consumes Slot

              recipe
                hosted: slot '\` + hostedSlotId + \`'
                ${next}
                  root: consumes hosted
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

    const slotComposer = new SlotComposer();
    const loader = new Loader(null, {
      ...sources,
      'Z.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          getTemplate() { return 'Z'; }
        };
      });`,
    });
    const context = await Manifest.parse(`
      particle A in 'A.js'
        root: consumes Slot

      recipe
        root: slot 'rootslotid-root'
        A
          root: consumes root
    `);
    const id = IdGenerator.newSession().newArcId('arcid');
    const arc = new Arc({id, loader, slotComposer, context});

    const [recipe] = arc.context.recipes;
    recipe.normalize();
    await arc.instantiate(recipe);
  });

  it('handles serialization/deserialization of empty arcs handles', async () => {
    const id = ArcId.newForTest('test');
    const loader = new Loader();

    const manifest = await Manifest.parse(`
        schema FavoriteFood
          food: Text

        particle FavoriteFoodPicker in 'particles/Profile/source/FavoriteFoodPicker.js'
          foods: reads writes [FavoriteFood]
          description \`select favorite foods\`
            foods \`favorite foods\`

        recipe FavoriteFood
          foods: create #favoriteFoods
          FavoriteFoodPicker
            foods: foods
        `, {loader, fileName: process.cwd() + '/input.manifest'});

    const storageKey = Flags.useNewStorageStack ? new VolatileStorageKey(id, '') : 'volatile://' + id.toString();
    const arc = new Arc({id, storageKey, loader: new Loader(), context: manifest});
    assert.isNotNull(arc);

    const favoriteFoodClass = Entity.createEntityClass(manifest.findSchemaByName('FavoriteFood'), null);
    assert.isNotNull(favoriteFoodClass);

    const recipe = manifest.recipes[0];
    assert.isNotNull(recipe);

    const favoriteFoodType = manifest.findTypeByName('FavoriteFood');
    assert.isNotNull(favoriteFoodType, 'FavoriteFood type is found');

    const options = {errors: new Map()};
    const normalized = recipe.normalize(options);
    assert(normalized, 'not normalized ' + options.errors);
    assert(recipe.isResolved());
    await arc.instantiate(recipe);

    const serialization = await arc.serialize();

    const slotComposer = new SlotComposer();

    const newArc = await Arc.deserialize({serialization, loader, slotComposer, context: manifest, fileName: 'foo.manifest'});
    assert.strictEqual(newArc._stores.length, 1);
    assert.strictEqual(newArc.activeRecipe.toString(), arc.activeRecipe.toString());
    assert.strictEqual(newArc.id.idTreeAsString(), 'test');
  });

  it('registers and deregisters its own volatile storage', Flags.withNewStorageStack(async () => {
    const id1 = ArcId.newForTest('test1');
    const id2 = ArcId.newForTest('test2');
    const storageKey1 = new VolatileStorageKey(id1, '');
    const storageKey2 = new VolatileStorageKey(id2, '');

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
  }));
});

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
      await assertThrowsAsync(async () => {
        await setup('volatile://');
      }, `Can't use string storage keys with new storage stack.`);
    });

    it('sets ttl on create entities', async () => {
      const id = ArcId.newForTest('test');
      const loader = new Loader(null, {
        '*': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            setHandles(handles) {
              super.setHandles(handles);
              const things0Handle = this.handles.get('things0');
              things0Handle.add(new things0Handle.entityClass({name: 'hello'}));
              const things1Handle = this.handles.get('things1');
              things1Handle.add(new things1Handle.entityClass({name: 'world'}));
            }
          }
        });
      `});
      // TODO: add `copy` handle to recipe.
      const manifest = await Manifest.parse(`
          schema Thing
            name: Text
          particle ThingAdder in './ThingAdder.js'
            things0: reads writes [Thing]
            things1: reads writes [Thing]
          recipe
            h0: create @ttl(3m)
            h1: create @ttl(12h)
            ThingAdder
              things0: h0
              things1: h1
          `, {loader, fileName: process.cwd() + '/input.manifest'});
      const recipe = manifest.recipes[0];
      assert.isTrue(recipe.normalize() && recipe.isResolved());

      const runtime = new Runtime({loader, context: manifest});
      const arc = runtime.newArc('test', volatileStorageKeyPrefixForTest());
      await arc.instantiate(recipe);
      await arc.idle;

      const verifyStoreTtl = async (connectionName, expectedValue, expectedTtl) => {
        const store = arc.findStoreById(
            arc.activeRecipe.particles[0].connections[connectionName].handle.id);
        // tslint:disable-next-line: no-any
        assert.equal((store as Store<any>).ttl.toString(), expectedTtl);
        const activeStore = await store.activate();
        const contents = await activeStore.serializeContents();
        assert.lengthOf(Object.keys(contents['values']), 1);
        const value = Object.values(contents['values'])[0]['value'];
        assert.isTrue(value.id.length > 0);
        assert.equal(value.rawData['name'], expectedValue);
        // TODO(mmandlis): assert entities have expiration timestamp
        // assert.isNotNull(value.expirationTimestamp);
      };
      await verifyStoreTtl('things0', 'hello', '3m');
      await verifyStoreTtl('things1', 'world', '12h');
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
      await assertThrowsAsync(async () => {
        await arc.createStore(Foo.type, undefined, 'test:1');
      }, `Can't use new-style storage keys with the old storage stack.`);
    });
  });
});
