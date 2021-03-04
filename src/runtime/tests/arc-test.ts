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
import {Flags} from '../flags.js';
import {Id, ArcId, IdGenerator} from '../id.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {CallbackTracker} from '../testing/callback-tracker.js';
import {SlotComposer} from '../slot-composer.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {SingletonType, EntityType} from '../../types/lib-types.js';
import {Runtime} from '../runtime.js';
import {RecipeResolver} from '../recipe-resolver.js';
import {DriverFactory} from '../storage/drivers/driver-factory.js';
import {VolatileStorageKey, VolatileDriver, VolatileStorageKeyFactory} from '../storage/drivers/volatile.js';
import {StorageKey} from '../storage/storage-key.js';
import {ReferenceModeStore} from '../storage/reference-mode-store.js';
import {DirectStoreMuxer} from '../storage/direct-store-muxer.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {DirectStore} from '../storage/direct-store.js';
import {ramDiskStorageKeyPrefixForTest, volatileStorageKeyPrefixForTest} from '../testing/handle-for-test.js';
import {Entity} from '../entity.js';
import {RamDiskStorageDriverProvider} from '../storage/drivers/ramdisk.js';
import {ReferenceModeStorageKey} from '../storage/reference-mode-storage-key.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {handleForStoreInfo, SingletonEntityType, CollectionEntityType} from '../storage/storage.js';
import {Capabilities, Ttl, Queryable, Persistence} from '../capabilities.js';
import {StoreInfo} from '../storage/store-info.js';

async function setup(storageKeyPrefix:  (arcId: ArcId) => StorageKey) {
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
  const arc = runtime.newArc({arcName: 'test', storageKeyPrefix});

  return {
    runtime,
    arc,
    context: manifest,
    recipe: manifest.recipes[0],
    Foo: Entity.createEntityClass(manifest.findSchemaByName('Foo'), null),
    Bar: Entity.createEntityClass(manifest.findSchemaByName('Bar'), null),
    loader
  };
}

describe('Arc new storage', () => {
  it('preserves data when round-tripping through serialization', async () => {
    // TODO(shans): deserialization currently uses a RamDisk store to deserialize into because we don't differentiate
    // between parsing a manifest for public consumption (e.g. with RamDisk resources in it) and parsing a serialized
    // arc (with an @activeRecipe). We'll fix this by adding a 'private' keyword to store serializations which will
    // be used when serializing arcs. Once that is working then the following registration should be removed.
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
    const runtime = new Runtime({loader});
    runtime.context = await runtime.parseFile('./manifest');

    const opts = runtime.host.buildArcParams({arcName: 'test'});
    const arc = runtime.newArc({arcId: opts.id});

    const dataClass = Entity.createEntityClass(runtime.context.findSchemaByName('Data'), null);
    const varStore = await arc.createStore(new SingletonType(dataClass.type), undefined, 'test:0');
    const colStore = await arc.createStore(dataClass.type.collectionOf(), undefined, 'test:1');

    const refVarKey  = new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'colVar'), new VolatileStorageKey(arc.id, 'refVar'));
    const refVarStore = await arc.createStore(new SingletonType(dataClass.type), undefined, 'test:2', [], refVarKey);

    const varHandle = await handleForStoreInfo(varStore, arc);
    const colHandle = await handleForStoreInfo(colStore, arc);
    const refVarHandle = await handleForStoreInfo(refVarStore, arc);

    // Populate the stores, run the arc and get its serialization.
    const d1 = new dataClass({value: 'v1'});
    const d2 = new dataClass({value: 'v2', size: 20}, 'i2');
    const d3 = new dataClass({value: 'v3', size: 30}, 'i3');
    const d4 = new dataClass({value: 'v4', size: 10}, 'i4');
    await varHandle.set(d1);
    await colHandle.add(d2);
    await colHandle.add(d3);
    await refVarHandle.set(d4);

    const recipe = runtime.context.recipes[0];
    recipe.handles[0].mapToStorage(varStore);
    recipe.handles[1].mapToStorage(colStore);
    recipe.handles[2].mapToStorage(refVarStore);

    await runtime.allocator.runPlanInArc(arc.id, recipe);

    const serialization = await arc.serialize();
    arc.dispose();

    await varHandle.clear();
    await colHandle.clear();
    await refVarHandle.clear();

    const {context, storageService, driverFactory, storageKeyParser} = opts;
    const arc2 = await Arc.deserialize({fileName: '', serialization, loader, context, storageService, driverFactory, storageKeyParser});
    const varStore2 = arc2.findStoreById(varStore.id) as StoreInfo<SingletonEntityType>;
    const colStore2 = arc2.findStoreById(colStore.id) as StoreInfo<CollectionEntityType>;
    const refVarStore2 = arc2.findStoreById(refVarStore.id) as StoreInfo<SingletonEntityType>;

    const varHandle2 = await handleForStoreInfo(varStore2, arc2);
    const varData = await varHandle2.fetch();
    assert.deepEqual(varData, d1);

    const colHandle2 = await handleForStoreInfo(colStore2, arc2);
    const colData = await colHandle2.toList();
    assert.deepEqual(colData, [d2, d3]);

    const refVarHandle2 = await handleForStoreInfo(refVarStore2, arc2);
    const refVarData = await refVarHandle2.fetch();
    assert.deepEqual(refVarData, d4);
  });

  it('supports capabilities - storage protocol', Flags.withDefaultReferenceMode(async () => {
    const loader = new Loader(null, {
      '*': `
        defineParticle(({Particle}) => {
          return class extends Particle {}
        });
    `});
    const runtime = new Runtime({loader});
    const manifestText = `
      schema Thing
      particle MyParticle in 'MyParticle.js'
        thing: writes Thing
      recipe
        handle0: create @tiedToArc
        MyParticle
          thing: handle0
    `;
    const manifest = await runtime.parse(manifestText, {fileName: process.cwd() + '/input.manifest'});
    runtime.context = manifest;
    const arc = await runtime.startArc({arcName: 'test', storageKeyPrefix: ramDiskStorageKeyPrefixForTest()});
    await arc.idle;

    // Reference mode store and its backing and container stores.
    assert.lengthOf(arc.activeRecipe.handles, 3);
    const key = arc.activeRecipe.particles[0].connections['thing'].handle.storageKey;
    assert.instanceOf(key, ReferenceModeStorageKey);
    const refKey = key as ReferenceModeStorageKey;
    assert.instanceOf(refKey.backingKey, VolatileStorageKey);
    assert.instanceOf(refKey.storageKey, VolatileStorageKey);
    assert.isTrue(key.toString().includes(arc.id.toString()));
  }));
});

const doSetup = async () => setup(arcId => new VolatileStorageKey(arcId, ''));

describe('Arc', () => {
  it('idle can safely be called multiple times ', async () => {
    const runtime = new Runtime();
    const arc = runtime.newArc({arcName: 'test'});
    const f = async () => { await arc.idle; };
    await Promise.all([f(), f()]);
  });

  it('applies existing stores to a particle', async () => {
    const {runtime, arc, recipe, Foo, Bar} = await doSetup();
    const fooStore = await arc.createStore(new SingletonType(Foo.type), undefined, 'test:1');
    const barStore = await arc.createStore(new SingletonType(Bar.type), undefined, 'test:2');
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    const barHandle = await handleForStoreInfo(barStore, arc);

    await fooHandle.set(new Foo({value: 'a Foo'}));
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;
    assert.deepStrictEqual(await barHandle.fetch() as {}, {value: 'a Foo1'});
  });

  it('applies new stores to a particle ', async () => {
    const {runtime, arc, recipe, Foo, Bar} = await doSetup();
    const fooStore = await arc.createStore(new SingletonType(Foo.type), undefined, 'test:1');
    const barStore = await arc.createStore(new SingletonType(Bar.type), undefined, 'test:2');
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    const barHandle = await handleForStoreInfo(barStore, arc);

    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    await fooHandle.set(new Foo({value: 'a Foo'}));
    await arc.idle;
    assert.deepStrictEqual(await barHandle.fetch() as {}, {value: 'a Foo1'});
  });

  it('optional provided handles do not resolve without parent', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
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
    `, {fileName: process.cwd() + '/input.manifest'});

    const arc = runtime.newArc({arcName: 'test'});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
    const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
    const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
    const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');
    const aHandle = await handleForStoreInfo(aStore, arc);
    const bHandle = await handleForStoreInfo(bStore, arc);
    const cHandle = await handleForStoreInfo(cStore, arc);
    const dHandle = await handleForStoreInfo(dStore, arc);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.fetch() as {}, {value: 'from_a1'});
    assert.isNull(await dHandle.fetch());
  });

  it('instantiates recipes only if fate is correct', async () => {
    const loader = new Loader(null, {
      './a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });
    const runtime = new Runtime({loader});

    const data = '{"root": {"values": {}, "version": {}}, "locations": {}}';
    const type = '![Thing]';
    const manifest = await runtime.parse(`
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
    `);
    // Successfully instantiates a recipe with 'copy' handle for store in a context.
    runtime.context = manifest;
    await runtime.startArc({arcName: 'test0', planName: 'CopyStoreFromContext'});

    // Fails instantiating a recipe with 'use' handle for store in a context.
    try {
      await runtime.startArc({arcName: 'test1', planName: 'UseStoreFromContext'});
      assert.fail();
    } catch (e) {
      assert.isTrue(e.toString().includes('store \'storeInContext\'')); // with "use" fate was not found'));
    }

    const arc = await runtime.newArc({arcName: 'test2'});
    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    await arc.createStore(new SingletonType(thingClass.type), 'name', 'storeInArc');
    const resolver = new RecipeResolver(arc);

    // Fails resolving a recipe with 'copy' handle for store in the arc (not in context).
    assert.isNull(await resolver.resolve(manifest.recipes[2]));
    const recipe3 = await resolver.resolve(manifest.recipes[3]);
    // Successfully instantiates a recipe with 'use' handle for store in an arc.
    await runtime.allocator.runPlanInArc(arc.id, recipe3);
  });

  it('required provided handles do not resolve without parent', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
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
    `, {fileName: process.cwd() + '/input.manifest'});

    const arc = runtime.newArc({arcName: 'test'});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
    const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
    const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
    const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');
    const aHandle = await handleForStoreInfo(aStore, arc);
    const bHandle = await handleForStoreInfo(bStore, arc);
    const cHandle = await handleForStoreInfo(cStore, arc);
    const dHandle = await handleForStoreInfo(dStore, arc);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.fetch() as {}, {value: 'from_a1'});
    assert.isNull(await dHandle.fetch());
  });

  it('optional provided handles cannot resolve without parent', async () => {
    await assertThrowsAsync(async () => {
      const runtime = new Runtime();
      const manifest = await runtime.parse(`
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
      `, {fileName: process.cwd() + '/input.manifest'});
      const arc = runtime.newArc({arcName: 'test'});

      const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
      const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
      const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
      const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
      const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');

      const recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(aStore);
      recipe.handles[1].mapToStorage(bStore);
      recipe.handles[2].mapToStorage(cStore); // These might not be needed?
      recipe.handles[3].mapToStorage(dStore); // These might not be needed?
      await runtime.allocator.runPlanInArc(arc.id, recipe);
    },
    /.*unresolved handle-connection: parent connection 'c' missing/);
  });

  it('required provided handles cannot resolve without parent', async () => {
    await assertThrowsAsync(async () => {
      const runtime = new Runtime();
      const context = await runtime.parse(`
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
      `, {fileName: process.cwd() + '/input.manifest'});

      const arc = runtime.newArc({arcName: 'test'});

      const thingClass = Entity.createEntityClass(context.findSchemaByName('Thing'), null);
      const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
      const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
      const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
      const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');

      const recipe = context.recipes[0];
      recipe.handles[0].mapToStorage(aStore);
      recipe.handles[1].mapToStorage(bStore);
      recipe.handles[2].mapToStorage(cStore); // These might not be needed?
      recipe.handles[3].mapToStorage(dStore); // These might not be needed?
      await runtime.allocator.runPlanInArc(arc.id, recipe);
    },
    /.*unresolved handle-connection: parent connection 'c' missing/);
  });

  it('optional provided handles are not required to resolve with dependencies', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
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
    `, {fileName: process.cwd() + '/input.manifest'});
    const arc = runtime.newArc({arcName: 'test'});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
    const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
    const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
    const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');
    const aHandle = await handleForStoreInfo(aStore, arc);
    const bHandle = await handleForStoreInfo(bStore, arc);
    const cHandle = await handleForStoreInfo(cStore, arc);
    const dHandle = await handleForStoreInfo(dStore, arc);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await cHandle.set(new thingClass({value: 'from_c'}));
    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;
    assert.deepStrictEqual(await bHandle.fetch() as {}, {value: 'from_a1'});
    assert.isNull(await dHandle.fetch());
  });

  it('required provided handles must resolve with dependencies', async () => {
    await assertThrowsAsync(async () => {
      const runtime = new Runtime();
      const manifest = await runtime.parse(`
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
      `, {fileName: process.cwd() + '/input.manifest'});
      const arc = runtime.newArc({arcName: 'test'});

      const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
      const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
      const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
      const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
      const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');

      const recipe = manifest.recipes[0];
      recipe.handles[0].mapToStorage(aStore);
      recipe.handles[1].mapToStorage(bStore);
      recipe.handles[2].mapToStorage(cStore); // These might not be needed?
      recipe.handles[3].mapToStorage(dStore); // These might not be needed?
      await runtime.allocator.runPlanInArc(arc.id, recipe);
    },
    /.*unresolved particle: unresolved connections/);
  });

  it('optional provided handles can resolve with parent 1', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
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
    `, {fileName: process.cwd() + '/input.manifest'});
    const arc = runtime.newArc({arcName: 'test'});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
    const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
    const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
    const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');
    const aHandle = await handleForStoreInfo(aStore, arc);
    const bHandle = await handleForStoreInfo(bStore, arc);
    const cHandle = await handleForStoreInfo(cStore, arc);
    const dHandle = await handleForStoreInfo(dStore, arc);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.fetch() as {}, {value: 'from_a1'});
    assert.deepStrictEqual(await dHandle.fetch() as {}, {value: 'from_c1'});
  });

  it('required provided handles can resolve with parent 2', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
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
    `, {fileName: process.cwd() + '/input.manifest'});
    const arc = runtime.newArc({arcName: 'test'});

    const thingClass = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
    const aStore = await arc.createStore(new SingletonType(thingClass.type), 'aStore', 'test:1');
    const bStore = await arc.createStore(new SingletonType(thingClass.type), 'bStore', 'test:2');
    const cStore = await arc.createStore(new SingletonType(thingClass.type), 'cStore', 'test:3');
    const dStore = await arc.createStore(new SingletonType(thingClass.type), 'dStore', 'test:4');
    const aHandle = await handleForStoreInfo(aStore, arc);
    const bHandle = await handleForStoreInfo(bStore, arc);
    const cHandle = await handleForStoreInfo(cStore, arc);
    const dHandle = await handleForStoreInfo(dStore, arc);

    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(aStore);
    recipe.handles[1].mapToStorage(bStore);
    recipe.handles[2].mapToStorage(cStore); // These might not be needed?
    recipe.handles[3].mapToStorage(dStore); // These might not be needed?
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    await aHandle.set(new thingClass({value: 'from_a'}));
    await cHandle.set(new thingClass({value: 'from_c'}));
    await arc.idle;
    assert.deepStrictEqual(await bHandle.fetch() as {}, {value: 'from_a1'});
    assert.deepStrictEqual(await dHandle.fetch() as {}, {value: 'from_c1'});
  });

  it('deserializing a serialized empty arc produces an empty arc', async () => {
    const runtime = new Runtime();
    const opts = runtime.host.buildArcParams({arcName: 'test'});
    const arc = new Arc(opts);
    await arc.idle;

    const serialization = await arc.serialize();
    arc.dispose();

    const newArc = await Arc.deserialize({serialization, context, fileName: 'foo.manifest', ...opts});
    await newArc.idle;
    assert.strictEqual(newArc.stores.length, 0);
    assert.strictEqual(newArc.activeRecipe.toString(), `@active\n${arc.activeRecipe.toString()}`);
    assert.strictEqual(newArc.id.idTreeAsString(), 'test');
    newArc.dispose();
  });

  it('deserializing a simple serialized arc produces that arc', async () => {
    const {runtime, arc, context, recipe, Foo, Bar, loader} = await doSetup();
    let fooStore = await arc.createStore(new SingletonType(Foo.type), undefined, 'test:1');
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    const fooStoreCallbacks = CallbackTracker.create(await arc.getActiveStore(fooStore), 1);
    await fooHandle.set(new Foo({value: 'a Foo'}));

    let barStore = await arc.createStore(new SingletonType(Bar.type), undefined, 'test:2', ['tag1', 'tag2']);
    const barHandle = await handleForStoreInfo(barStore, arc);

    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(barStore);
    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;

    assert.deepStrictEqual(await barHandle.fetch() as {}, {value: 'a Foo1'});
    fooStoreCallbacks.verify();
    const serialization = await arc.serialize();
    arc.dispose();

    const {driverFactory, storageService, storageKeyParser} = arc;
    const newArc = await Arc.deserialize({serialization, loader, fileName: '', slotComposer: new SlotComposer(), context, storageService, driverFactory, storageKeyParser});
    await newArc.idle;
    fooStore = newArc.findStoreById(fooStore.id) as StoreInfo<SingletonEntityType>;
    barStore = newArc.findStoreById(barStore.id) as StoreInfo<SingletonEntityType>;
    assert(fooStore);
    assert(barStore);
    assert.lengthOf(newArc.findStoresByType(new SingletonType(Bar.type), {tags: ['tag1']}), 1);
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

    const runtime = new Runtime({loader});
    const manifest = await runtime.parseFile('./manifest');
    const arc = runtime.newArc({arcName: 'test'});
    const recipe = manifest.recipes[0];

    await runtime.allocator.runPlanInArc(arc.id, recipe);
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

  it('registers and deregisters its own volatile storage', async () => {
    const id1 = ArcId.newForTest('test1');
    const id2 = ArcId.newForTest('test2');
    const storageKey1 = new VolatileStorageKey(id1, '');
    const storageKey2 = new VolatileStorageKey(id2, '');

    // runtime creates a default RamDisk with SimpleVolatileMemoryProvider
    const runtime = new Runtime();
    const {storageService, driverFactory, storageKeyParser} = runtime;
    assert.equal(driverFactory.providers.size, 1);

    const arc1 = new Arc({id: id1, storageKey: storageKey1, loader: new Loader(), context: new Manifest({id: id1}), storageService, driverFactory, storageKeyParser});
    assert.strictEqual(driverFactory.providers.size, 2);

    const arc2 = new Arc({id: id2, storageKey: storageKey2, loader: new Loader(), context: new Manifest({id: id2}), storageService, driverFactory, storageKeyParser});
    assert.strictEqual(driverFactory.providers.size, 3);

    arc1.dispose();
    assert.strictEqual(driverFactory.providers.size, 2);

    arc2.dispose();
    assert.equal(driverFactory.providers.size, 1);
  });

  it('preserves create handle ids if specified', Flags.withDefaultReferenceMode(async () => {
    const loader = new Loader(null, {
      'a.js': `
        defineParticle(({Particle}) => class Noop extends Particle {});
      `
    });

    const memoryProvider = new TestVolatileMemoryProvider();
    const manifest = await Manifest.parse(`
        schema Thing
        particle MyParticle in 'a.js'
          thing: writes Thing
        recipe
          h0: create 'mything'
          MyParticle
            thing: writes h0
        `, {memoryProvider});

    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = await runtime.startArc({arcName: 'test0'});
    assert.lengthOf(arc.activeRecipe.handles, 3);
    const myThingHandle = arc.activeRecipe.handles.find(h => h.id === 'mything');
    assert.isNotNull(myThingHandle);
    assert.instanceOf(myThingHandle.storageKey, ReferenceModeStorageKey);
    const refKey = myThingHandle.storageKey as ReferenceModeStorageKey;
    assert.isNotNull(arc.activeRecipe.handles.find(
        h => h.storageKey.toString() === refKey.backingKey.toString()));
    assert.isNotNull(arc.activeRecipe.handles.find(
        h => h.storageKey.toString() === refKey.storageKey.toString()));
  }));
});

describe('Arc storage migration', () => {
  it('supports new StorageKey type', Flags.withDefaultReferenceMode(async () => {
    const {arc, Foo} = await setup(arcId => new VolatileStorageKey(arcId, ''));
    const fooStore = await arc.createStore(new SingletonType(Foo.type), undefined, 'test:1');
    assert.instanceOf(fooStore, StoreInfo);
    const activeStore = await arc.getActiveStore(fooStore);
    assert.instanceOf(activeStore, ReferenceModeStore);
    assert.instanceOf(activeStore['backingStore'], DirectStoreMuxer);
    const backingStore = activeStore['containerStore'] as DirectStore<CRDTTypeRecord>;
    assert.instanceOf(backingStore.driver, VolatileDriver);
    assert.instanceOf(activeStore['containerStore'], DirectStore);
    const directStore = activeStore['containerStore'] as DirectStore<CRDTTypeRecord>;
    assert.instanceOf(directStore.driver, VolatileDriver);
  }));

  it('sets ttl on create entities', async () => {
    const id = ArcId.newForTest('test');
    const loader = new Loader(null, {
      'ThingAdder.js': `
      defineParticle(({Particle}) => {
        return class extends Particle {
          async setHandles(handles) {
            super.setHandles(handles);
            // Add a single entity to each collection and a singleton.
            const things0Handle = this.handles.get('things0');
            const hello = new things0Handle.entityClass({name: 'hello'});
            things0Handle.add(hello);
            const things1Handle = this.handles.get('things1');
            things1Handle.add(new things1Handle.entityClass({name: 'foo'}));
            const things2Handle = this.handles.get('things2');
            things2Handle.set(new things2Handle.entityClass({name: 'bar'}));

            // wait 1s and add an additional item to things0.
            await new Promise(resolve => setTimeout(resolve, 1000));
            things0Handle.add(new things0Handle.entityClass({name: 'world'}));
            things0Handle.add(hello);
          }
        }
      });
    `});
    // TODO: add `copy` handle to recipe.
    const manifest = await Manifest.parse(`
        schema Thing
          name: Text
        particle ThingAdder in 'ThingAdder.js'
          things0: reads writes [Thing]
          things1: reads writes [Thing]
          things2: reads writes Thing
        recipe
          h0: create @ttl('3m')
          h1: create @ttl('23h')
          h2: create @ttl('2d')
          ThingAdder
            things0: h0
            things1: h1
            things2: h2
        `);
    const volatileFactory = new class extends VolatileStorageKeyFactory {
      capabilities(): Capabilities {
        return Capabilities.create([Persistence.inMemory(), Ttl.any(), Queryable.any()]);
      }
    }();
    const runtime = new Runtime({loader, context: manifest, storageKeyFactories: [volatileFactory]});
    const arc = await runtime.startArc({arcName: 'test', storageKeyPrefix: volatileStorageKeyPrefixForTest()});
    await arc.idle;

    const getStoreByConnectionName = async (connectionName) => {
      const store = arc.findStoreById(
        arc.activeRecipe.particles[0].connections[connectionName].handle.id);
      return arc.getActiveStore(store);
    };
    const getStoreValue = (storeContents, index, expectedLength) => {
      assert.lengthOf(Object.keys(storeContents['values']), expectedLength);
      const value = Object.values(storeContents['values'])[index]['value'];
      assert.sameMembers(Object.keys(value), ['id', 'rawData', 'creationTimestamp', 'expirationTimestamp']);
      assert.isTrue(value.id.length > 0);
      return value;
    };

    const things0Store = await getStoreByConnectionName('things0');
    if (things0Store instanceof DirectStoreMuxer) {
      assert.fail('things0 store can not be a direct store muxer');
    }
    const helloThing0 = await getStoreValue(await things0Store.serializeContents(), 0, 2);
    assert.equal(helloThing0.rawData.name, 'hello');
    const worldThing0 = await getStoreValue(await things0Store.serializeContents(), 1, 2);
    assert.equal(worldThing0.rawData.name, 'world');

    // `world` entity was added 1s after `hello`.
    // This also verifies `hello` wasn't update when being re-added.
    if (worldThing0.expirationTimestamp - helloThing0.expirationTimestamp < 1000) {
      console.warn(`Flaky test: worldThing0.expirationTimestamp - helloThing0.expirationTimestamp` +
          `${worldThing0.expirationTimestamp} - ${helloThing0.expirationTimestamp} < 1000`);
    }
    assert.isTrue(worldThing0.expirationTimestamp - helloThing0.expirationTimestamp >= 1000);

    const things1Store = await getStoreByConnectionName('things1');
    if (things1Store instanceof DirectStoreMuxer) {
      assert.fail('things1 store can not be a direct store muxer');
    }
    const fooThing1 = await getStoreValue(await things1Store.serializeContents(), 0, 1);
    assert.equal(fooThing1.rawData.name, 'foo');

    const things2Store = await getStoreByConnectionName('things2');
    if (things2Store instanceof DirectStoreMuxer) {
      assert.fail('things2 store can not be a direct store muxer');
    }
    const barThing2 = await getStoreValue(await things2Store.serializeContents(), 0, 1);
    assert.equal(barThing2.rawData.name, 'bar');
    // `foo` was added at the same time as `bar`, `bar` has a >1d longer ttl than `foo`.
    assert.isTrue(barThing2.expirationTimestamp - fooThing1.expirationTimestamp >
        24 * 60 * 60 * 1000);
  });
});
