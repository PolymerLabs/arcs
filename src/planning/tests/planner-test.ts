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
import {Arc} from '../../runtime/arc.js';
import {Particle} from '../../runtime/particle.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Planner} from '../planner.js';
import {Speculator} from '../speculator.js';

import {assertThrowsAsync, ConCap} from '../../testing/test-util.js';
import {StrategyTestHelper} from '../testing/strategy-test-helper.js';
import {ArcId} from '../../runtime/id.js';

import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../../runtime/storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';
import {EntityType} from '../../runtime/type.js';
import {Entity} from '../../runtime/entity.js';
import {DriverFactory} from '../../runtime/storageNG/drivers/driver-factory.js';

async function planFromManifest(manifest, {arcFactory, testSteps}: {arcFactory?, testSteps?} = {}) {
  const loader = new Loader();
  const memoryProvider = new TestVolatileMemoryProvider();
  RamDiskStorageDriverProvider.register(memoryProvider);
  if (typeof manifest === 'string') {
    const fileName = './test.manifest';
    manifest = await Manifest.parse(manifest, {loader, fileName, memoryProvider});
  }

  arcFactory = arcFactory || ((manifest) => StrategyTestHelper.createTestArc(manifest));
  testSteps = testSteps || ((planner) => planner.plan(Infinity, []));

  const arc = await arcFactory(manifest);
  const planner = new Planner();
  const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
  planner.init(arc, options);
  const result = await testSteps(planner);

  DriverFactory.clearRegistrationsForTesting();

  return result;
}

const assertRecipeResolved = recipe => {
  assert(recipe.normalize());
  assert.isTrue(recipe.isResolved());
};

class NullLoader extends Loader {
  constructor() {
    super(null, {});
  }
  join(prefix: string) {
    return '';
  }
  async loadResource(path: string): Promise<string> {
    return '[]';
  }
}

class MyLoader extends Loader {
  private manifest;

  constructor(manifest) {
    super(null, {manifest});
    this.manifest = manifest;
  }

  async requireParticle(fileName: string): Promise<typeof Particle> {
    const clazz = class extends Particle {
      relevances: number[];

      constructor() {
        super();
        this.relevances = [1];
      }
      async setHandles(handles) {
        const thingHandle = handles.get('thing');
        thingHandle.set(new thingHandle.entityClass({name: 'MYTHING'}));
      }
    };
    return clazz;
  }
  clone() {
    return new MyLoader({manifest: this.manifest});
  }
}

const loadTestArcAndRunSpeculation = async (manifest, manifestLoadedCallback) => {
  const registry = {};
  const memoryProvider = new TestVolatileMemoryProvider();
  const loader = new MyLoader(manifest);
  const loadedManifest = await Manifest.load('manifest', loader, {registry, memoryProvider});
  manifestLoadedCallback(loadedManifest);

  const arc = new Arc({id: ArcId.newForTest('test-plan-arc'), context: loadedManifest, loader});
  const planner = new Planner();
  const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc), speculator: new Speculator()};
  planner.init(arc, options);

  const plans = await planner.suggest(Infinity);
  return {plans, arc};
};

describe('Planner', () => {
  it('can map remote handles structurally', async () => {
    const results = await planFromManifest(`
      store AStore of * {text: Text, moreText: Text} in './src/runtime/tests/artifacts/Things/empty.json'
      particle P1 in './some-particle.js'
        text: reads * {text: Text}
      recipe
        h0: map *
        P1
          text: reads h0
    `);
    assert.lengthOf(results, 1);
  });

  it('can copy remote handles structurally', async () => {
    const results = await planFromManifest(`
      store AStore of * {text: Text, moreText: Text} in './src/runtime/tests/artifacts/Things/empty.json'
      particle P1 in './some-particle.js'
        text: reads * {text: Text}
      recipe
        h0: copy *
        P1
          text: reads h0
    `);
    assert.lengthOf(results, 1);
  });

  it('resolves particles with multiple optional consumed slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: consumes? Slot
        two: consumes? Slot
      recipe
        s0: slot 'slot-id0'
        P1
          one: consumes s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes Slot
        two: \`consumes Slot
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consumes s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed set slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes [Slot]
        two: \`consumes [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consumes s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed slots with the implicit any direction', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes Slot
        two: \`consumes Slot
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed set with the implicit any direction', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes [Slot]
        two: \`consumes [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with slots with other slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './pass-through.js'
        inSlot: \`consumes Slot
        outSlot: \`provides Slot
      particle P2 in './render.js'
        inSlot: \`consumes Slot
      recipe
        s0: \`slot 'slot-id0'
        s1: \`slot 'slot-id1'
        P1
          inSlot: s0
          outSlot: s1
        P2
          inSlot: s1
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with set slots with other set slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './pass-through.js'
        inSlot: \`consumes Slot
        outSlot: \`provides [Slot]
      particle P2 in './render.js'
        inSlot: \`consumes [Slot]
      recipe
        s0: \`slot 'slot-id0'
        s1: \`slot 'slot-id1'
        P1
          inSlot: s0
          outSlot: s1
        P2
          inSlot: s1
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES cannot resolve slots with set slots', async () => {
    const cc = await ConCap.capture(() => planFromManifest(`
      particle P1 in './pass-through.js'
        inSlot: \`consumes Slot
        outSlot: \`provides Slot
      particle P2 in './render.js'
        inSlot: \`consumes [Slot]
      recipe
        s0: \`slot 'slot-id0'
        s1: \`slot 'slot-id1'
        P1
          inSlot: s0
          outSlot: s1
        P2
          inSlot: s1
    `));
    assert.deepEqual(cc.result, []);
    assert.match(cc.warn[0], /Type validations failed for handle/);
  });

  it('SLANDLES cannot resolve multiple consumed slots with incorrect directions', async () => {
    await assertThrowsAsync(async () => {
      await planFromManifest(`
        particle P1 in './some-particle.js'
          one: \`consumes Slot
          two: \`consumes Slot
        recipe
          s0: \`slot 'slot-id0'
          P1
            one: \`provides s0
      `);
    }, 'not compatible with \'`consumes\'');
  });

  it('SLANDLES cannot resolve multiple consumed set slots with incorrect directions', async () => {
    await assertThrowsAsync(async () => {
      await planFromManifest(`
        particle P1 in './some-particle.js'
          one: \`consumes [Slot]
          two: \`consumes [Slot]
        recipe
          s0: \`slot 'slot-id0'
          P1
            one: \`provides s0
      `);
    }, 'not compatible with \'`consumes\'');
  });

  it('SLANDLES resolves particles with multiple consumed slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes Slot
        two: \`consumes Slot
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consumes s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed set SLANDLES with consume', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes [Slot]
        two: \`consumes [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consumes s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed set slots with any', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consumes [Slot]
        two: \`consumes [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: s0
    `);
    assert.lengthOf(results, 1);
  });

  it('can speculate in parallel', async () => {
    const manifest = `
      schema Thing
        name: Text

      particle A in 'A.js'
        thing: writes Thing
        root: consumes Slot
        description \`Make \${thing}\`

      recipe
        handle1: create *
        slot0: slot 'root-slot'
        A
          thing: writes handle1
          root: consumes slot0

      recipe
        handle2: create *
        slot1: slot 'root-slot2'
        A
          thing: writes handle2
          root: consumes slot1
    `;
    const {plans} = await loadTestArcAndRunSpeculation(manifest,
      manifest => {
        assertRecipeResolved(manifest.recipes[0]);
        assertRecipeResolved(manifest.recipes[1]);
      }
    );
    assert.lengthOf(plans, 2);
    // Make sure the recipes were processed as separate plan groups.
    // TODO(wkorman): When we move to a thread pool we'll revise this to check
    // the thread index instead.
    assert.strictEqual(plans[0].groupIndex, 0);
    assert.strictEqual(plans[1].groupIndex, 1);
  });
});

describe('AssignOrCopyRemoteHandles', () => {
  const particlesSpec = `
      schema Foo

      particle A in 'A.js'
        list: reads [Foo]
        root: consumes Slot

      particle B in 'A.js'
        list: reads writes [Foo]
        root: consumes Slot
  `;
  const testManifest = async (recipeManifest, expectedResults) => {
    const manifest = (await Manifest.parse(`
${particlesSpec}

${recipeManifest}
    `));

    const key = (unique: string) => new RamDiskStorageKey(unique);

    const schema = manifest.findSchemaByName('Foo');
    manifest.newStore({
      type: new EntityType(schema).collectionOf(),
      name: 'Test1',
      id: 'test-1',
      storageKey: key('storage-key-1'),
      tags: ['tag1'],
    });
    manifest.newStore({
      type: new EntityType(schema).collectionOf(),
      name: 'Test2',
      id: 'test-2',
      storageKey: key('storage-key-2'),
      tags: ['tag2'],
    });
    manifest.newStore({
      type: new EntityType(schema).collectionOf(),
      name: 'Test2',
      id: 'test-3',
      storageKey: key('storage-key-3'),
      tags: [],
    });

    const arc = StrategyTestHelper.createTestArc(manifest);

    const planner = new Planner();
    const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
    planner.init(arc, options);
    const plans = await planner.plan(1000);

    assert.lengthOf(plans, expectedResults, recipeManifest);
    return plans;
  };
  it('maps tagged remote handle', async () => {
    // map one
    await testManifest(`
      recipe
        list: map #tag1
        A as particle0
          list: reads list
    `, 1);
    await testManifest(`
      recipe
        list: map #tag2
        A as particle0
          list: reads list
    `, 1);
    await testManifest(`
      recipe
        list: map #tag3
        A as particle0
          list: reads list
    `, 0);
  });
  it('maps untagged remote handle', async () => {
    await testManifest(`
      recipe
        list: map *
        A as particle0
          list: reads list
    `, 3);
  });
  it('copies tagged remote handle', async () => {
    // copy one
    await testManifest(`
      recipe
        list: copy #tag1
        A as particle0
          list: reads list
    `, 1);
    await testManifest(`
      recipe
        list: copy #tag2
        A as particle0
          list: reads list
    `, 1);
    await testManifest(`
      recipe
        list: copy #tag3
        A as particle0
          list: reads list
    `, 0);
  });
  it('copies untagged remote handle', async () => {
    await testManifest(`
      recipe
        list: copy
        A as particle0
          list: reads list
    `, 3);
  });
  it('finds remote untagged handles with unknown fate (map)', async () => {
    const plansA = await testManifest(`
      recipe
        list: ?
        A as particle0
          list: reads list
    `, 3);
    assert.isTrue(plansA.every(plan => plan.handles.length === 1 && plan.handles.every(handle => handle.fate === 'map')));
  });
  it('finds remote tagged handles with unknown fate (map)', async () => {
    const plansA = await testManifest(`
      recipe
        list: ? #tag1
        A as particle0
          list: reads list
    `, 1);
    assert.lengthOf(plansA[0].handles, 1);
    assert.strictEqual('map', plansA[0].handles[0].fate);
  });
  it('finds remote untagged handles with unknown fate (copy)', async () => {
    const plansB = await testManifest(`
      recipe
        list: ?
        B as particle0
          list: list
    `, 3);
    assert.isTrue(plansB.every(plan => plan.handles.length === 1 && plan.handles.every(handle => handle.fate === 'copy')));
  });
  it('finds remote tagged handles with unknown fate (copy)', async () => {
    const plansB = await testManifest(`
      recipe
        list: ? #tag2
        B as particle0
          list: list
    `, 1);
    assert.lengthOf(plansB[0].handles, 1);
    assert.strictEqual('copy', plansB[0].handles[0].fate);
  });
  it('finds multiple remote handles', async () => {
    // both at once
    await testManifest(`
      recipe
        list: map #tag1
        list2: copy #tag2
        A as particle0
          list: reads list
        B as particle1
          list: list2
    `, 1);
    await testManifest(`
      recipe
        list: map #tag1
        list2: copy #tag3
        A as particle0
          list: reads list
        B as particle1
          list: list2
    `, 0);

    // both, but only one has a tag
    await testManifest(`
      recipe
        list: map #tag1
        list2: copy
        A as particle0
          list: reads list
        B as particle1
          list: list2
    `, 2);
    await testManifest(`
      recipe
        list: map *
        list2: copy #tag2
        A as particle0
          list: reads list
        B as particle1
          list: list2
    `, 2);

    // no tags leads to all possible permutations of 3 matching handles
    await testManifest(`
      recipe
        list: map *
        list2: copy
        A as particle0
          list: reads list
        B as particle1
          list: list2
    `, 6);
  });
});

describe('Type variable resolution', () => {
  let memoryProvider;

  beforeEach(() => {
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  const loadAndPlan = async (manifestStr) => {
    const loader = new NullLoader();
    const manifest = (await Manifest.parse(manifestStr, {loader, memoryProvider}));
    const arc = StrategyTestHelper.createTestArc(manifest);
    const planner = new Planner();
    const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
    planner.init(arc, options);
    return planner.plan(Infinity);
  };
  const verifyResolvedPlan = async (manifestStr) => {
    const plans = await loadAndPlan(manifestStr);
    assert.lengthOf(plans, 1);

    const recipe = plans[0];
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
  };

  const verifyUnresolvedPlan = async (manifestStr) => {
    const plans = await loadAndPlan(manifestStr);
    assert.isEmpty(plans);
  };
  it('unresolved type variables', async () => {
    // [~a] doesn't resolve to Thing.
    await verifyUnresolvedPlan(`
      schema Thing
      particle P
        thing: reads ~a
      recipe
        mythings: map #mythings
        P
          thing: reads mythings
      store MyThings of [Thing] #mythings in 'things.json'`);

    // ~a doesn't resolve to [Thing]
    await verifyUnresolvedPlan(`
      schema Thing
      particle P
        things: reads [~a]
      recipe
        mything: map #mything
        P
          things: reads mything
      store MyThing of Thing #mything in 'thing.json'`);

    // Different handles using the same type variable don't resolve to different type storages.
    await verifyUnresolvedPlan(`
      schema Thing1
      schema Thing2
      particle P
        manyThings: reads [~a]
        oneThing: writes ~a
      recipe
        manythings: map #manything
        onething: copy #onething
        P
          manyThings: reads manythings
          oneThing: writes onething
      store ManyThings of [Thing1] #manythings in 'things.json'
      store OneThing of Thing2 #onething in 'thing.json'`);
  });

  it('simple particles type variable resolution', async () => {
    await verifyResolvedPlan(`
      schema Thing1
      particle P1
        things: reads [Thing1]
      particle P2
        things: reads [~a]
      recipe
        mythings: map #mythings
        P1
          things: reads mythings
        P2
          things: reads mythings
      store MyThings of [Thing1] #mythings in 'things.json'`);

    await verifyResolvedPlan(`
      schema Thing1
      schema Thing2
      particle P2
        things: reads [~a]
      recipe
        mythings1: map #mythings1
        mythings2: map #mythings2
        P2
          things: reads mythings1
        P2
          things: reads mythings2
      store MyThings1 of [Thing1] #mythings1 in 'things1.json'
      store MyThings2 of [Thing2] #mythings2 in 'things2.json'`);

    await verifyResolvedPlan(`
      schema Thing1
      schema Thing2
      particle P2
        things: reads [~a]
        things2: reads [Thing2]
      recipe
        mythings1: map #mythings1
        mythings2: map #mythings2
        P2
          things: reads mythings1
          things2: reads mythings2
      store MyThings1 of [Thing1] #mythings1 in 'things1.json'
      store MyThings2 of [Thing2] #mythings2 in 'things2.json'`);

    await verifyResolvedPlan(`
      schema Thing
      particle P1
        things1: reads [~a]
      particle P2
        things2: reads [~b]
      recipe
        mythings: map #mythings
        P1
          things1: reads mythings
        P2
          things2: reads mythings
      store MyThings of [Thing] #mythings in 'things.json'`);
  });

  it('transformation particles type variable resolution', async () => {
    const particleSpecs = `
interface HostedInterface
  reads ~a
particle P1
  input: reads Thing1
particle Muxer in 'Muxer.js'
  hostedParticle: hosts HostedInterface
  list: reads [~a]
`;

    // One transformation particle
    await verifyResolvedPlan(`
${particleSpecs}
recipe
  mythings: map #mythings
  Muxer
    hostedParticle: P1
    list: reads mythings
schema Thing1
store MyThings of [Thing1] #mythings in 'things.json'`);

    // Two transformation particles hosting the same particle with same type storage.
    await verifyResolvedPlan(`
${particleSpecs}
recipe
  mythings1: map #mythings1
  mythings2: map #mythings2
  Muxer
    hostedParticle: P1
    list: reads mythings1
  Muxer
    hostedParticle: P1
    list: reads mythings2
schema Thing1
store MyThings1 of [Thing1] #mythings1 in 'things.json'
store MyThings2 of [Thing1] #mythings2 in 'things.json'`);

    // Transformations carry types through their interface, so P1 can't resolve with Thing2
    await verifyUnresolvedPlan(`
${particleSpecs}
recipe
  mythings: map #mythings
  Muxer
    hostedParticle: P1
    list: reads mythings
schema Thing1
schema Thing2
store MyThings of [Thing2] #mythings in 'things.json'`);

    // Two transformation particle hosting the same particle with different type storage.
    // NOTE: This doesn't work yet because we don't have a way of representing a concrete
    // type with type variable'd handles.
    /*
    await verifyResolvedPlan(`
${particleSpecs}
particle P2
  P2
  inthings: reads [~a]
recipe
  mythings1: map #mythings1
  mythings2: map #mythings2
  Muxer
    hostedParticle: P1
    list: reads mythings1
  Muxer
    hostedParticle: P1
    list: reads mythings2
schema Thing1
store MyThings1 of [Thing1] #mythings1 in 'things.json'
schema Thing2
store MyThings2 of [Thing2] #mythings2 in 'things.json'`);
  */
  });
});

describe('Description', () => {
  it('description generated from speculative execution arc', async () => {
    const manifest = `
    schema Thing
      name: Text

    particle A in 'A.js'
      thing: writes Thing
      root: consumes Slot
      description \`Make \${thing}\`

    recipe
      handle1: create *
      slot0: slot 'root-slot'
      A
        thing: writes handle1
        root: consumes slot0
    `;
    const {plans, arc} = await loadTestArcAndRunSpeculation(manifest,
      manifest => {
        assertRecipeResolved(manifest.recipes[0]);
      }
    );
    assert.lengthOf(plans, 1);
    assert.strictEqual('Make MYTHING.', await plans[0].descriptionText);
    assert.lengthOf(arc._stores, 0);
  });
});

describe('Automatic resolution', () => {
  const loadAndPlan = async (manifestStr: string, arcCreatedCallback?) => {
    return planFromManifest(manifestStr, {
      arcFactory: async manifest => {
        const arc = StrategyTestHelper.createTestArc(manifest);
        if (arcCreatedCallback) await arcCreatedCallback(arc, manifest);
        return arc;
      }
    });
  };
  const verifyResolvedPlans = async (manifestStr: string, arcCreatedCallback?) => {
    const plans = await loadAndPlan(manifestStr, arcCreatedCallback);
    for (const plan of plans) {
      plan.normalize();
      assert.isTrue(plan.isResolved(), `Plans were not able to be resolved from ${manifestStr}.`);
    }
    return plans;
  };
  const verifyResolvedPlan = async (manifestStr: string, arcCreatedCallback?) => {
    const plans = await verifyResolvedPlans(manifestStr, arcCreatedCallback);
    assert.lengthOf(plans, 1, `Plan was not able to be resolved from ${manifestStr}.`);
    return plans[0];
  };
  const verifyUnresolvedPlan = async (manifestStr: string, arcCreatedCallback?) => {
    const plans = await loadAndPlan(manifestStr, arcCreatedCallback);
    assert.isEmpty(plans, `Plan was unexpectedly able to be resolved from ${manifestStr}`);
  };

  it('introduces create handles for particle communication', async () => {
    // A new handle can be introduced to facilitate A: writes B communication.
    const recipe = await verifyResolvedPlan(`
      schema Thing
      particle A
        thing: writes Thing
      particle B
        thing: reads Thing

      recipe
        A
        B`);
    assert.lengthOf(recipe.handles, 1);
    assert.strictEqual('create', recipe.handles[0].fate);

    // A new handle cannot be introduced if both particles only read.
    await verifyUnresolvedPlan(`
      schema Thing
      particle A
        thing: reads Thing
      particle B
        thing: reads Thing

      recipe
        A
        B`);
  });

  it('coalesces recipes to resolve connections', async () => {
    const result = await verifyResolvedPlan(`
      schema Thing
        id: Text
      schema Product extends Thing
        name: Text
      schema Other
        count: Number
      schema Location
        lat: Number
        lng: Number

      particle A
        product: writes Product
      particle B
        thing: reads Thing
        other: writes Other
      particle C
        something: reads * {count: Number}
        location: reads Location
      particle D
        location: reads writes Location

      recipe
        product: ?
        A
          product: writes product
      recipe
        other: ?
        B
          other: writes other
      recipe
        C
      recipe
        location: ?
        D
          location: reads writes location
`);

    assert.strictEqual(`recipe
  handle0: create // ~
  handle1: create // ~
  handle2: create // Location {lat: Number, lng: Number}
  A as particle0
    product: writes handle0
  B as particle1
    other: writes handle1
    thing: reads handle0
  C as particle2
    location: reads handle2
    something: reads handle1
  D as particle3
    location: reads writes handle2`, result.toString({hideFields: false}));
  });

  it('uses existing handle from the arc', async () => {
    // An existing handle from the arc can be used as input to a recipe
    const recipe = await verifyResolvedPlan(`
      schema Thing
      particle A
        thing: reads Thing

      recipe
        A
      `,
      async (arc, manifest) => {
        const thing = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
        await arc.createStore(thing.type, undefined, 'test:1');
      }
    );

    assert.lengthOf(recipe.handles, 1);
    const [handle] = recipe.handles;
    assert.strictEqual('use', handle.fate);
    assert.strictEqual('test:1', handle.id);
  });

  it('composes recipe rendering a list of items from a recipe', async () => {
    let arc = null;
    const recipes = await verifyResolvedPlans(`
      import './src/runtime/tests/artifacts/Common/List.recipes'
      schema Thing

      particle ThingProducer
        things: writes [Thing]

      particle ThingRenderer
        thing: reads Thing
        item: consumes Slot

      recipe ProducingRecipe
        things: create #items
        ThingProducer`, arcRef => arc = arcRef);

    assert.lengthOf(recipes, 2);
    const composedRecipes = recipes.filter(r => r.name !== 'ProducingRecipe');
    assert.lengthOf(composedRecipes, 1);

    const recipeString = `recipe
  handle0: create #items // [Thing {}]
  handle1: create #selected // Thing {}
  slot1: slot 'rootslotid-root' #root
  ItemMultiplexer as particle0
    hostedParticle: hosts ThingRenderer
    list: reads handle0
    item: consumes slot0
  SelectableList as particle1
    items: reads writes handle0
    selected: reads writes handle1
    root: consumes slot1
      action: provides slot2
      annotation: provides slot3
      item: provides slot0
      postamble: provides slot4
      preamble: provides slot5
  ThingProducer as particle2
    things: writes handle0`;
    assert.strictEqual(composedRecipes[0].toString(), recipeString);
    assert.strictEqual(composedRecipes[0].toString({showUnresolved: true}), recipeString);
  });

  it('composes recipe rendering a list of items from the current arc', async () => {
    let arc = null;
    const recipes = await verifyResolvedPlans(`
        import './src/runtime/tests/artifacts/Common/List.recipes'
        schema Thing

        particle ThingRenderer
          thing: reads Thing
          item: consumes Slot`,
        async (arcRef, manifest) => {
          arc = arcRef;
          const thing = Entity.createEntityClass(manifest.findSchemaByName('Thing'), null);
          await arc.createStore(thing.type.collectionOf(), undefined, 'test-store', ['items']);
        });

    assert.lengthOf(recipes, 1);
    assert.strictEqual(recipes[0].toString(), `recipe SelectableUseListRecipe
  handle0: use 'test-store' #items // [Thing {}]
  handle1: create #selected // Thing {}
  slot1: slot 'rootslotid-root' #root
  ItemMultiplexer as particle0
    hostedParticle: hosts ThingRenderer
    list: reads handle0
    item: consumes slot0
  SelectableList as particle1
    items: reads writes handle0
    selected: reads writes handle1
    root: consumes slot1
      action: provides slot2
      annotation: provides slot3
      item: provides slot0
      postamble: provides slot4
      preamble: provides slot5`);
  });

  it('coalesces resolved recipe with no UI', async () => {
    const recipes = await verifyResolvedPlans(`
      schema Thing
      particle A in 'a.js'
        thing: writes Thing
      recipe
        thingHandle: create *
        A
          thing: writes thingHandle
      particle B in 'b.js'
        thing: reads writes Thing
        root: consumes Slot
      recipe
        root: slot '0'
        thingHandle: create *
        B
          thing: thingHandle
          root: consumes root
    `);
    // Both explicit recipes are resolved, and a new coalesced one is produced.
    assert.lengthOf(recipes, 3);
    assert.isTrue(recipes.some(recipe => recipe.particles.length === 1 && recipe.particles[0].name === 'A'));
    assert.isTrue(recipes.some(recipe => recipe.particles.length === 1 && recipe.particles[0].name === 'B'));
    const recipe = recipes.find(recipe => recipe.particles.length === 2);
    assert.deepEqual(['A', 'B'], recipe.particles.map(p => p.name).sort());
    // Verify the `thing` handle was coalesced.
    assert.lengthOf(recipe.handles, 1);
    assert.lengthOf(recipe.slots, 1);
  });

  it('reverifies other handle type while coalescing', async () => {
    const recipes = await verifyResolvedPlans(`
      schema Account
      schema Transaction
      particle TransactionFilter
        account: reads Account
        transactions: reads [Transaction]
        accountTransactions: reads writes [Transaction]
      recipe TransacationsByAccount
        accountTransactions: create #xactions #items
        account: create #selected //use #selected
        transactions: map 'myTransactions'
        TransactionFilter
          account: account
          transactions: transactions
          accountTransactions: accountTransactions
      store TransationList of [Transaction] 'myTransactions' in './src/runtime/tests/artifacts/Things/empty.json'

      interface HostedInterface
        reads ~a
      particle ShowTransation
        transaction: reads Transaction

      particle ItemMultiplexer
        hostedParticle: hosts HostedInterface
        list: reads [~a]

      particle List
        items: reads writes [~a]
        selected: reads writes ~a

      recipe
        items: use #items
        selected: create #selected
        List
          items: items
          selected: selected
        ItemMultiplexer
          list: items
    `);
    assert.lengthOf(recipes, 2);
    const coalesced = recipes.find(r => r.particles.length === 3);
    // Verify the #selected handles weren't coalesced - they are of different types.
    assert.lengthOf(coalesced.handles.filter(h => h.tags.length === 1 && h.tags[0] === 'selected'), 2);
  });

  const verifyRestaurantsPlanSearch = async (searchStr) => {
    let recipes = await verifyResolvedPlans(`
      import './src/runtime/tests/artifacts/Restaurants/Restaurants.recipes'
      import './src/runtime/tests/artifacts/People/Person.schema'

      store User of Person 'User' in './src/runtime/tests/artifacts/Things/empty.json'

      recipe
        search \`${searchStr}\`
        // Description is needed to differentiate this recipe from its equivalent in .recipes file.
        description \`This is the test recipe\`
    `, () => {});

    recipes = recipes.filter(recipe => recipe.search);
    assert.lengthOf(recipes, 1, 'Expected the recipe list to contain a search.');
    return recipes[0];
  };

  it('searches and coalesces nearby restaurants by recipe name', async () => {
    const recipe = await verifyRestaurantsPlanSearch('nearby restaurants');
    assert.deepEqual(recipe.particles.map(p => p.name).sort(),
      ['FindRestaurants', 'ExtractLocation', 'RestaurantList', 'RestaurantMasterDetail', 'RestaurantDetail'].sort());
    assert.lengthOf(recipe.handles, 4);
  });

  it('searches and coalesces make reservation by recipe name', async () => {
    const recipe = await verifyRestaurantsPlanSearch('make reservation');
    assert.deepEqual(recipe.particles.map(p => p.name).sort(),
      ['FindRestaurants', 'ExtractLocation', 'PartySize', 'ReservationAnnotation', 'ReservationForm', 'RestaurantList', 'RestaurantMasterDetail', 'RestaurantDetail'].sort());

    // Verify handles.
    assert.lengthOf(recipe.handles, 6);
    // Only descriptions and person handle have one handle connection.
    assert.isTrue(recipe.handles.every(h => h.connections.length > 1 || ['descriptions', 'person'].includes(h.connections[0].name)));
    // Only person handle has fate other than `create`
    assert.isTrue(recipe.handles.every(h => h.fate === 'create' || 'person' === h.connections[0].name));
    // Naive verification that a specific connection name only binds to the same handle.
    recipe.handles.forEach(handle => handle.connections.every(conn => {
      assert.isTrue(recipe.handles.every(otherHandle => handle === otherHandle || !otherHandle.connections.some(otherConn => otherConn.name === conn.name)),
                    `Connection name ${conn.name} is bound to multiple handles.`);
    }));
  });

  it('searches and coalesces "nearby restaurants make reservation"', async () => {
    const recipe = await verifyRestaurantsPlanSearch('nearby restaurants make reservation');
    assert.deepEqual(recipe.particles.map(p => p.name).sort(),
      ['FindRestaurants', 'ExtractLocation', 'PartySize', 'ReservationAnnotation', 'ReservationForm', 'RestaurantList', 'RestaurantMasterDetail', 'RestaurantDetail'].sort());
    // Verify handles.
    assert.lengthOf(recipe.handles, 6);
    // Only descriptions and person handle have one handle connection.
    assert.isTrue(recipe.handles.every(h => h.connections.length > 1 || ['descriptions', 'person'].includes(h.connections[0].name)));
    // Only person handle has fate other than `create`
    assert.isTrue(recipe.handles.every(h => h.fate === 'create' || 'person' === h.connections[0].name));
    // Naive verification that a specific connection name only binds to the same handle.
    recipe.handles.forEach(handle => handle.connections.every(conn => {
      assert.isTrue(recipe.handles.every(otherHandle => handle === otherHandle || !otherHandle.connections.some(otherConn => otherConn.name === conn.name)),
                    `Connection name ${conn.name} is bound to multiple handles.`);
    }));
  });

  it('searches and coalesces "nearby restaurants calendar"', async () => {
    const recipe = await verifyRestaurantsPlanSearch('nearby restaurants calendar');
    assert.deepEqual(recipe.particles.map(p => p.name).sort(),
      ['Calendar', 'FindRestaurants', 'ExtractLocation', 'PartySize', 'ReservationAnnotation', 'ReservationForm', 'RestaurantList', 'RestaurantMasterDetail', 'RestaurantDetail'].sort());
    // Verify handles.
    assert.lengthOf(recipe.handles, 7);
    // Only descriptions and person handle have one handle connection.
    assert.isTrue(recipe.handles.every(h => h.connections.length > 1 || ['descriptions', 'person'].includes(h.connections[0].name)));
    // Only person handle has fate other than `create`
    assert.isTrue(recipe.handles.every(h => h.fate === 'create' || 'person' === h.connections[0].name));
    // Naive verification that a specific connection name only binds to the same handle.
    recipe.handles.forEach(handle => handle.connections.every(conn => {
      assert.isTrue(conn.name === 'descriptions' ||
                    recipe.handles.every(otherHandle => handle === otherHandle || !otherHandle.connections.some(otherConn => otherConn.name === conn.name)),
                    `Connection name ${conn.name} is bound to multiple handles.`);
    }));
  });

  // TODO: FindRestaurants particle, found by search term never tries 'create' handle as part of strategizing.
  it.skip('searches and coalesces restaurants recipes by particle name', async () => {
    const recipes = await verifyResolvedPlans(`
      import './src/runtime/tests/artifacts/Restaurants/Restaurants.recipes'
      import './src/runtime/tests/artifacts/People/Person.schema'

      store User of Person 'User' in './src/runtime/tests/artifacts/Things/empty.json'

      recipe
        search \`find restaurants\`
    `, () => {});

    assert.lengthOf(recipes, 1);
    assert.deepEqual(recipes[0].particles.map(p => p.name).sort(),
      ['FindRestaurants', 'ExtractLocation', 'RestaurantList', 'RestaurantMasterDetail', 'RestaurantDetail'].sort());
  });
});
