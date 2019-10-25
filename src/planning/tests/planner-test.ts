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
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {StubLoader} from '../../runtime/testing/stub-loader.js';
import {Planner} from '../planner.js';
import {Speculator} from '../speculator.js';

import {assertThrowsAsync} from '../../runtime/testing/test-util.js';
import {StrategyTestHelper} from '../testing/strategy-test-helper.js';
import {Id, ArcId} from '../../runtime/id.js';

import {Flags} from '../../runtime/flags.js';

async function planFromManifest(manifest, {arcFactory, testSteps}: {arcFactory?, testSteps?} = {}) {
  const loader = new Loader();
  if (typeof manifest === 'string') {
    const fileName = './test.manifest';
    manifest = await Manifest.parse(manifest, {loader, fileName});
  }

  arcFactory = arcFactory || ((manifest) => StrategyTestHelper.createTestArc(manifest));
  testSteps = testSteps || ((planner) => planner.plan(Infinity, []));

  const arc = await arcFactory(manifest);
  const planner = new Planner();
  const options = {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)};
  planner.init(arc, options);
  return await testSteps(planner);
}

const assertRecipeResolved = recipe => {
  assert(recipe.normalize());
  assert.isTrue(recipe.isResolved());
};

class NullLoader extends StubLoader {
  constructor() {
    super({});
  }
  join(prefix: string) {
    return '';
  }
  async loadResource(path: string): Promise<string> {
    return '[]';
  }
}

class MyLoader extends StubLoader {
  private manifest;

  constructor(manifest) {
    super({manifest});
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
  const loader = new MyLoader(manifest);
  const loadedManifest = await Manifest.load('manifest', loader, {registry});
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
      store AStore of * {Text text, Text moreText} in './src/runtime/tests/artifacts/Things/empty.json'
      particle P1 in './some-particle.js'
        in * {Text text} text
      recipe
        map as h0
        P1
          text <- h0
    `);
    assert.lengthOf(results, 1);
  });

  it('can copy remote handles structurally', async () => {
    const results = await planFromManifest(`
      store AStore of * {Text text, Text moreText} in './src/runtime/tests/artifacts/Things/empty.json'
      particle P1 in './some-particle.js'
        in * {Text text} text
      recipe
        copy as h0
        P1
          text <- h0
    `);
    assert.lengthOf(results, 1);
  });

  it('resolves particles with multiple consumed slots', async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        consume one
        consume two
      recipe
        slot 'slot-id0' as s0
        P1
          consume one as s0
    `);
    assert.lengthOf(results, 1);
  });

  it('SLANDLES resolves particles with multiple consumed slots', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume Slot
        two: \`consume Slot
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consume s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with multiple consumed set slots', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume [Slot]
        two: \`consume [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consume s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with multiple consumed slots with the any direction', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume Slot
        two: \`consume Slot
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: any s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with multiple consumed set with the any direction', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume [Slot]
        two: \`consume [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: any s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with slots with other slots', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './pass-through.js'
        inSlot: \`consume Slot
        outSlot: \`provide Slot
      particle P2 in './render.js'
        inSlot: \`consume Slot
      recipe
        s0: \`slot 'slot-id0'
        s1: \`slot 'slot-id1'
        P1
          inSlot: any s0
          outSlot: any s1
        P2
          inSlot: any s1
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with set slots with other set slots', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './pass-through.js'
        inSlot: \`consume Slot
        outSlot: \`provide [Slot]
      particle P2 in './render.js'
        inSlot: \`consume [Slot]
      recipe
        s0: \`slot 'slot-id0'
        s1: \`slot 'slot-id1'
        P1
          inSlot: any s0
          outSlot: any s1
        P2
          inSlot: any s1
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES cannot resolve slots with set slots', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './pass-through.js'
        inSlot: \`consume Slot
        outSlot: \`provide Slot
      particle P2 in './render.js'
        inSlot: \`consume [Slot]
      recipe
        s0: \`slot 'slot-id0'
        s1: \`slot 'slot-id1'
        P1
          inSlot: any s0
          outSlot: any s1
        P2
          inSlot: any s1
    `);
    assert.lengthOf(results, 0);
  }));

  it('SLANDLES cannot resolve multiple consumed slots with incorrect directions', Flags.withPostSlandlesSyntax(async () => {
    assertThrowsAsync(async () => {
      await planFromManifest(`
        particle P1 in './some-particle.js'
          one: \`consume Slot
          two: \`consume Slot
        recipe
          s0: \`slot 'slot-id0'
          P1
            one: \`provide s0
      `);
    }, 'not compatible with \'`consume\'');
  }));

  it('SLANDLES cannot resolve multiple consumed set slots with incorrect directions', Flags.withPostSlandlesSyntax(async () => {
    assertThrowsAsync(async () => {
      await planFromManifest(`
        particle P1 in './some-particle.js'
          one: \`consume [Slot]
          two: \`consume [Slot]
        recipe
          s0: \`slot 'slot-id0'
          P1
            one: \`provide s0
      `);
    }, 'not compatible with \'`consume\'');
  }));

  it('SLANDLES resolves particles with multiple consumed slots', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume Slot
        two: \`consume Slot
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consume s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with multiple consumed set SLANDLES with consume', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume [Slot]
        two: \`consume [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: \`consume s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('SLANDLES resolves particles with multiple consumed set slots with any', Flags.withPostSlandlesSyntax(async () => {
    const results = await planFromManifest(`
      particle P1 in './some-particle.js'
        one: \`consume [Slot]
        two: \`consume [Slot]
      recipe
        s0: \`slot 'slot-id0'
        P1
          one: any s0
    `);
    assert.lengthOf(results, 1);
  }));

  it('can speculate in parallel', async () => {
    const manifest = `
          schema Thing
            Text name

          particle A in 'A.js'
            out Thing thing
            consume root
            description \`Make \${thing}\`

          recipe
            create as handle1
            slot 'root-slot' as slot0
            A
              thing -> handle1
              consume root as slot0

          recipe
            create as handle2
            slot 'root-slot2' as slot1
            A
              thing -> handle2
              consume root as slot1
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
        in [Foo] list
        consume root

      particle B in 'A.js'
        inout [Foo] list
        consume root
  `;
  const testManifest = async (recipeManifest, expectedResults) => {
    const manifest = (await Manifest.parse(`
${particlesSpec}

${recipeManifest}
    `));

    const schema = manifest.findSchemaByName('Foo');
    manifest.newStore({
      type: schema.type.collectionOf(),
      name: 'Test1',
      id: 'test-1',
      storageKey: 'storage-key-1',
      tags: ['tag1'],
    });
    manifest.newStore({
      type: schema.type.collectionOf(),
      name: 'Test2',
      id: 'test-2',
      storageKey: 'storage-key-2',
      tags: ['tag2'],
    });
    manifest.newStore({
      type: schema.type.collectionOf(),
      name: 'Test2',
      id: 'test-3',
      storageKey: 'storage-key-3',
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
        map #tag1 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        map #tag2 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        map #tag3 as list
        A as particle0
          list <- list
    `, 0);
  });
  it('maps untagged remote handle', async () => {
    await testManifest(`
      recipe
        map as list
        A as particle0
          list <- list
    `, 3);
  });
  it('copies tagged remote handle', async () => {
    // copy one
    await testManifest(`
      recipe
        copy #tag1 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        copy #tag2 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        copy #tag3 as list
        A as particle0
          list <- list
    `, 0);
  });
  it('copies untagged remote handle', async () => {
    await testManifest(`
      recipe
        copy as list
        A as particle0
          list <- list
    `, 3);
  });
  it('finds remote untagged handles with unknown fate', async () => {
    const plansA = await testManifest(`
      recipe
        ? as list
        A as particle0
          list <- list
    `, 3);
    assert.isTrue(plansA.every(plan => plan.handles.length === 1 && plan.handles.every(handle => handle.fate === 'map')));

    const plansB = await testManifest(`
      recipe
        ? as list
        B as particle0
          list = list
    `, 3);
    assert.isTrue(plansB.every(plan => plan.handles.length === 1 && plan.handles.every(handle => handle.fate === 'copy')));
  });
  it('finds remote tagged handles with unknown fate', async () => {
    const plansA = await testManifest(`
      recipe
        ? #tag1 as list
        A as particle0
          list <- list
    `, 1);
    assert.lengthOf(plansA[0].handles, 1);
    assert.strictEqual('map', plansA[0].handles[0].fate);

    const plansB = await testManifest(`
      recipe
        ? #tag2 as list
        B as particle0
          list = list
    `, 1);
    assert.lengthOf(plansB[0].handles, 1);
    assert.strictEqual('copy', plansB[0].handles[0].fate);
  });
  it('finds multiple remote handles', async () => {
    // both at once
    await testManifest(`
      recipe
        map #tag1 as list
        copy #tag2 as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 1);
    await testManifest(`
      recipe
        map #tag1 as list
        copy #tag3 as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 0);

    // both, but only one has a tag
    await testManifest(`
      recipe
        map #tag1 as list
        copy as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 2);
    await testManifest(`
      recipe
        map as list
        copy #tag2 as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 2);

    // no tags leads to all possible permutations of 3 matching handles
    await testManifest(`
      recipe
        map as list
        copy as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 6);
  });
});

describe('Type variable resolution', () => {
  const loadAndPlan = async (manifestStr) => {
    const loader = new NullLoader();
    const manifest = (await Manifest.parse(manifestStr, {loader}));
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
        in ~a thing
      recipe
        map #mythings as mythings
        P
          thing <- mythings
      store MyThings of [Thing] #mythings in 'things.json'`);

    // ~a doesn't resolve to [Thing]
    await verifyUnresolvedPlan(`
      schema Thing
      particle P
        in [~a] things
      recipe
        map #mything as mything
        P
          things <- mything
      store MyThing of Thing #mything in 'thing.json'`);

    // Different handles using the same type variable don't resolve to different type storages.
    await verifyUnresolvedPlan(`
      schema Thing1
      schema Thing2
      particle P
        in [~a] manyThings
        out ~a oneThing
      recipe
        map #manything as manythings
        copy #onething as onething
        P
          manyThings <- manythings
          oneThing -> onething
      store ManyThings of [Thing1] #manythings in 'things.json'
      store OneThing of Thing2 #onething in 'thing.json'`);
  });

  it('simple particles type variable resolution', async () => {
    await verifyResolvedPlan(`
      schema Thing1
      particle P1
        in [Thing1] things
      particle P2
        in [~a] things
      recipe
        map #mythings as mythings
        P1
          things <- mythings
        P2
          things <- mythings
      store MyThings of [Thing1] #mythings in 'things.json'`);

    await verifyResolvedPlan(`
      schema Thing1
      schema Thing2
      particle P2
        in [~a] things
      recipe
        map #mythings1 as mythings1
        map #mythings2 as mythings2
        P2
          things <- mythings1
        P2
          things <- mythings2
      store MyThings1 of [Thing1] #mythings1 in 'things1.json'
      store MyThings2 of [Thing2] #mythings2 in 'things2.json'`);

    await verifyResolvedPlan(`
      schema Thing1
      schema Thing2
      particle P2
        in [~a] things
        in [Thing2] things2
      recipe
        map #mythings1 as mythings1
        map #mythings2 as mythings2
        P2
          things <- mythings1
          things2 <- mythings2
      store MyThings1 of [Thing1] #mythings1 in 'things1.json'
      store MyThings2 of [Thing2] #mythings2 in 'things2.json'`);

    await verifyResolvedPlan(`
      schema Thing
      particle P1
        in [~a] things1
      particle P2
        in [~b] things2
      recipe
        map #mythings as mythings
        P1
          things1 <- mythings
        P2
          things2 <- mythings
      store MyThings of [Thing] #mythings in 'things.json'`);
  });

  it('transformation particles type variable resolution', async () => {
    const particleSpecs = `
interface HostedInterface
  in ~a *
particle P1
  in Thing1 input
particle Muxer in 'Muxer.js'
  host HostedInterface hostedParticle
  in [~a] list
`;

    // One transformation particle
    await verifyResolvedPlan(`
${particleSpecs}
recipe
  map #mythings as mythings
  Muxer
    hostedParticle = P1
    list <- mythings
schema Thing1
store MyThings of [Thing1] #mythings in 'things.json'`);

    // Two transformation particles hosting the same particle with same type storage.
    await verifyResolvedPlan(`
${particleSpecs}
recipe
  map #mythings1 as mythings1
  map #mythings2 as mythings2
  Muxer
    hostedParticle = P1
    list <- mythings1
  Muxer
    hostedParticle = P1
    list <- mythings2
schema Thing1
store MyThings1 of [Thing1] #mythings1 in 'things.json'
store MyThings2 of [Thing1] #mythings2 in 'things.json'`);

    // Transformations carry types through their interface, so P1 can't resolve with Thing2
    await verifyUnresolvedPlan(`
${particleSpecs}
recipe
  map #mythings as mythings
  Muxer
    hostedParticle = P1
    list <- mythings
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
  P2(in [~a] inthings)
recipe
  map #mythings1 as mythings1
  map #mythings2 as mythings2
  Muxer
    hostedParticle = P1
    list <- mythings1
  Muxer
    hostedParticle = P1
    list <- mythings2
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
      Text name

    particle A in 'A.js'
      out Thing thing
      consume root
      description \`Make \${thing}\`

    recipe
      create as handle1
      slot 'root-slot' as slot0
      A
        thing -> handle1
        consume root as slot0
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
    // A new handle can be introduced to facilitate A -> B communication.
    const recipe = await verifyResolvedPlan(`
      schema Thing
      particle A
        out Thing thing
      particle B
        in Thing thing

      recipe
        A
        B`);
    assert.lengthOf(recipe.handles, 1);
    assert.strictEqual('create', recipe.handles[0].fate);

    // A new handle cannot be introduced if both particles only read.
    await verifyUnresolvedPlan(`
      schema Thing
      particle A
        in Thing thing
      particle B
        in Thing thing

      recipe
        A
        B`);
  });

  it('SLANDLES SYNTAX coalesces recipes to resolve connections', Flags.withPostSlandlesSyntax(async () => {
    const result = await verifyResolvedPlan(`
      schema Thing
        Text id
      schema Product extends Thing
        Text name
      schema Other
        Number count
      schema Location
        Number lat
        Number lng

      particle A
        product: out Product
      particle B
        thing: in Thing
        other: out Other
      particle C
        something: in * {Number count}
        location: in Location
      particle D
        location: inout Location

      recipe
        product: ?
        A
          product: out product
      recipe
        other: ?
        B
          other: out other
      recipe
        C
      recipe
        location: ?
        D
          location: inout location
`);

    assert.strictEqual(`recipe
  handle0: create // ~
  handle1: create // ~
  handle2: create // Location {Number lat, Number lng}
  A as particle0
    product: out handle0
  B as particle1
    other: out handle1
    thing: in handle0
  C as particle2
    location: in handle2
    something: in handle1
  D as particle3
    location: inout handle2`, result.toString({hideFields: false}));
  }));

  // TODO(jopra): Remove once slandles unification syntax is implemented.
  it('coalesces recipes to resolve connections', Flags.withPreSlandlesSyntax(async () => {
    const result = await verifyResolvedPlan(`
      schema Thing
        Text id
      schema Product extends Thing
        Text name
      schema Other
        Number count
      schema Location
        Number lat
        Number lng

      particle A
        out Product product
      particle B
        in Thing thing
        out Other other
      particle C
        in * {Number count} something
        in Location location
      particle D
        inout Location location

      recipe
        ? as product
        A
          product -> product
      recipe
        ? as other
        B
          other -> other
      recipe
        C
      recipe
        ? as location
        D
          location <-> location
`);

    assert.strictEqual(`recipe
  create as handle0 // ~
  create as handle1 // ~
  create as handle2 // Location {Number lat, Number lng}
  A as particle0
    product -> handle0
  B as particle1
    other -> handle1
    thing <- handle0
  C as particle2
    location <- handle2
    something <- handle1
  D as particle3
    location <-> handle2`, result.toString({hideFields: false}));
  }));

  it('uses existing handle from the arc', async () => {
    // An existing handle from the arc can be used as input to a recipe
    const recipe = await verifyResolvedPlan(`
      schema Thing
      particle A
        in Thing thing

      recipe
        A
      `,
      async (arc, manifest) => {
        const thing = manifest.findSchemaByName('Thing').entityClass();
        await arc.createStore(thing.type, undefined, 'test:1');
      }
    );

    assert.lengthOf(recipe.handles, 1);
    const [handle] = recipe.handles;
    assert.strictEqual('use', handle.fate);
    assert.strictEqual('test:1', handle.id);
  });

  it('SLANDLES SYNTAX composes recipe rendering a list of items from a recipe', Flags.withPostSlandlesSyntax(async () => {
    let arc = null;
    const recipes = await verifyResolvedPlans(`
      import './src/runtime/tests/artifacts/Common/SLANDLESListRecipes.arcs'
      schema Thing

      particle ThingProducer
        things: out [Thing]

      particle ThingRenderer
        thing: in Thing
        item: consume? Slot

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
    hostedParticle: host ThingRenderer
    list: in handle0
    item: consume slot0
  SelectableList as particle1
    items: inout handle0
    selected: inout handle1
    root: consume slot1
      action: provide slot2
      annotation: provide slot3
      item: provide slot0
      postamble: provide slot4
      preamble: provide slot5
  ThingProducer as particle2
    things: out handle0`;
    assert.strictEqual(composedRecipes[0].toString(), recipeString);
    assert.strictEqual(composedRecipes[0].toString({showUnresolved: true}), recipeString);
  }));
  // TODO(jopra): Remove once slandles unification syntax is implemented.
  it('composes recipe rendering a list of items from a recipe', Flags.withPreSlandlesSyntax(async () => {
    let arc = null;
    const recipes = await verifyResolvedPlans(`
      import './src/runtime/tests/artifacts/Common/List.recipes'
      schema Thing

      particle ThingProducer
        out [Thing] things

      particle ThingRenderer
        in Thing thing
        consume item

      recipe ProducingRecipe
        create #items as things
        ThingProducer`, arcRef => arc = arcRef);

    assert.lengthOf(recipes, 2);
    const composedRecipes = recipes.filter(r => r.name !== 'ProducingRecipe');
    assert.lengthOf(composedRecipes, 1);

    const recipeString = `recipe
  create #items as handle0 // [Thing {}]
  create #selected as handle1 // Thing {}
  slot 'rootslotid-root' #root as slot1
  ItemMultiplexer as particle0
    hostedParticle = ThingRenderer
    list <- handle0
    consume item as slot0
  SelectableList as particle1
    items <-> handle0
    selected <-> handle1
    consume root as slot1
      provide action as slot2
      provide annotation as slot3
      provide item as slot0
      provide postamble as slot4
      provide preamble as slot5
  ThingProducer as particle2
    things -> handle0`;
    assert.strictEqual(composedRecipes[0].toString(), recipeString);
    assert.strictEqual(composedRecipes[0].toString({showUnresolved: true}), recipeString);
  }));
  it('SLANDLES SYNTAX composes recipe rendering a list of items from the current arc', Flags.withPostSlandlesSyntax(async () => {
    let arc = null;
    const recipes = await verifyResolvedPlans(`
        import './src/runtime/tests/artifacts/Common/SLANDLESListRecipes.arcs'
        schema Thing

        particle ThingRenderer
          thing: in Thing
          item: consume? Slot`,
        async (arcRef, manifest) => {
          arc = arcRef;
          const thing = manifest.findSchemaByName('Thing').entityClass();
          await arc.createStore(thing.type.collectionOf(), undefined, 'test-store', ['items']);
        });

    assert.lengthOf(recipes, 1);
    assert.strictEqual(recipes[0].toString(), `recipe SelectableUseListRecipe
  handle0: use 'test-store' #items // [Thing {}]
  handle1: create #selected // Thing {}
  slot1: slot 'rootslotid-root' #root
  ItemMultiplexer as particle0
    hostedParticle: host ThingRenderer
    list: in handle0
    item: consume slot0
  SelectableList as particle1
    items: inout handle0
    selected: inout handle1
    root: consume slot1
      action: provide slot2
      annotation: provide slot3
      item: provide slot0
      postamble: provide slot4
      preamble: provide slot5`);
  }));

  // TODO(jopra): Remove once slandles unification syntax is implemented.
  it('composes recipe rendering a list of items from the current arc', Flags.withPreSlandlesSyntax(async () => {
    let arc = null;
    const recipes = await verifyResolvedPlans(`
        import './src/runtime/tests/artifacts/Common/List.recipes'
        schema Thing

        particle ThingRenderer
          in Thing thing
          consume item`,
        async (arcRef, manifest) => {
          arc = arcRef;
          const thing = manifest.findSchemaByName('Thing').entityClass();
          await arc.createStore(thing.type.collectionOf(), undefined, 'test-store', ['items']);
        });

    assert.lengthOf(recipes, 1);
    assert.strictEqual(recipes[0].toString(), `recipe SelectableUseListRecipe
  use 'test-store' #items as handle0 // [Thing {}]
  create #selected as handle1 // Thing {}
  slot 'rootslotid-root' #root as slot1
  ItemMultiplexer as particle0
    hostedParticle = ThingRenderer
    list <- handle0
    consume item as slot0
  SelectableList as particle1
    items <-> handle0
    selected <-> handle1
    consume root as slot1
      provide action as slot2
      provide annotation as slot3
      provide item as slot0
      provide postamble as slot4
      provide preamble as slot5`);
  }));
  it('coalesces resolved recipe with no UI', async () => {
    const recipes = await verifyResolvedPlans(`
      schema Thing
      particle A in 'a.js'
        out Thing thing
      recipe
        create as thingHandle
        A
          thing -> thingHandle
      particle B in 'b.js'
        inout Thing thing
        consume root
      recipe
        slot '0' as root
        create as thingHandle
        B
          thing = thingHandle
          consume root as root
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
        in Account account
        in [Transaction] transactions
        inout [Transaction] accountTransactions
      recipe TransacationsByAccount
        create #xactions #items as accountTransactions
        create #selected as account  //use #selected as account
        map 'myTransactions' as transactions
        TransactionFilter
          account = account
          transactions = transactions
          accountTransactions = accountTransactions
      store TransationList of [Transaction] 'myTransactions' in './src/runtime/tests/artifacts/Things/empty.json'

      interface HostedInterface
        in ~a *
      particle ShowTransation
        in Transaction transaction

      particle ItemMultiplexer
        host HostedInterface hostedParticle
        in [~a] list

      particle List
        inout [~a] items
        inout ~a selected

      recipe
        use #items as items
        create #selected as selected
        List
          items = items
          selected = selected
        ItemMultiplexer
          list = items
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
