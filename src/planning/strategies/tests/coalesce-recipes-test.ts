/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {TestVolatileMemoryProvider} from '../../../runtime/testing/test-volatile-memory-provider.js';
import {RamDiskStorageDriverProvider} from '../../../runtime/storage/drivers/ramdisk.js';
import {CoalesceRecipes} from '../../strategies/coalesce-recipes.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

describe('CoalesceRecipes', () => {
  let memoryProvider;
  beforeEach(() => {
      memoryProvider = new TestVolatileMemoryProvider();
      RamDiskStorageDriverProvider.register(memoryProvider);
  });

  async function tryCoalesceRecipes(manifestStr: string) {
    const manifest = await Manifest.parse(manifestStr, {memoryProvider});
    const recipes = manifest.recipes;
    assert.isTrue(recipes.every(recipe => recipe.normalize()));
    assert.isFalse(recipes.every(recipe => recipe.isResolved()));
    const arc = StrategyTestHelper.createTestArc(manifest);
    const strategy = new CoalesceRecipes(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const inputParams = {generated: [], terminal: recipes.map(recipe => ({result: recipe, score: 1}))};
    return await strategy.generate(inputParams);
  }

  async function doNotCoalesceRecipes(manifestStr: string) {
    const results = await tryCoalesceRecipes(manifestStr);
    assert.isEmpty(results);
  }

  async function doCoalesceRecipes(manifestStr: string, options?) {
    options = options || {};
    const results = await tryCoalesceRecipes(manifestStr);
    // dedup identical coalescing outputs
    const resultsMap = new Map();
    results.forEach(r => {
      if (!options.skipUnresolved || r.result.isResolved()) {
        resultsMap.set(r.result.toString(), r.result);
      }
    });
    assert.strictEqual(1, resultsMap.size);
    return [...resultsMap.values()][0];
  }

  it('coalesces required slots', async () => {
    const recipe = await doCoalesceRecipes(`
      particle P1
        root: consumes Slot
          foo: provides Slot

      particle P2
        foo: consumes Slot

      recipe
        slot0: slot 'id0'
        P1
          root: consumes slot0
      recipe
        P2
    `);

    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.particles, 2);
    assert.lengthOf(recipe.slots, 2);
  });

  it('coalesces required slots with handles', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing
      schema OtherThing
      particle P1
        thing: reads Thing
        root: consumes Slot
          foo: provides Slot {handle: thing}

      particle P2
        thing: reads Thing
        other: writes OtherThing
        foo: consumes Slot

      particle P3
        thing: writes Thing

      recipe
        slot0: slot 'id0'
        thingHandle: copy 'mything'
        P1
          thing: thingHandle
          root: consumes slot0

      recipe
        thingHandle: use *
        otherHandle: create *
        P2
          thing: thingHandle
          other: otherHandle
        P3
          thing: thingHandle

      resource MyThing
          start
          []
      store Store0 of Thing 'mything' in MyThing
    `);

    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.particles, 3);
    assert.lengthOf(recipe.slots, 2);
  });

  it('ignores host connections for handle requirements', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing
      particle P1
        thing: reads writes Thing
        root: consumes Slot
          foo: provides Slot {handle: thing}

      interface HostedInterface
        reads ~a
      particle P2
        hostedParticle: hosts HostedInterface
        thing: reads Thing
        foo: consumes Slot

      recipe
        slot0: slot 'id0'
        thingHandle: copy *
        P1
          thing: thingHandle
          root: consumes slot0

      recipe
        thingHandle: use *
        P2
          thing: thingHandle
    `);

    assert.isTrue(Object.isFrozen(recipe), 'recipe should be valid');
    assert.lengthOf(recipe.particles, 2);
    assert.lengthOf(recipe.slots, 2);

    // hostedParticle connection should not be affected.
    const p2 = recipe.particles.find(p => p.name === 'P2');
    assert.strictEqual('hostedParticle', p2.spec.getConnectionByName('hostedParticle').name);
    assert.isUndefined(p2.connections['hostedParticle']);
  });

  it('does not coalesce required slots if handle constraint is not met', async () => {
    await doNotCoalesceRecipes(`
      schema Thing
      particle P1
        thing: reads writes Thing
        root: consumes Slot
          foo: provides Slot {handle: thing}
      particle P2
        foo: consumes Slot
      recipe
        slot0: slot 'id0'
        thingHandle: create *
        P1
          thing: thingHandle
          root: consumes slot0
      recipe
        P2
    `);
  });

  describe('evaluates fates of handles of required slot in coalesced recipes', async () => {
    const parseManifest = async (options) => {
      return `
        schema Thing

        particle P1
          thing: reads Thing
          root: consumes Slot
            foo: provides Slot {handle: thing}

        particle P2
          thing: reads Thing
          ${options.outThingB ? 'outThing: writes Thing' : ''}
          foo: consumes Slot

        recipe A
          slot0: slot 'id0'
          thingHandle: ${options.fateA}
          P1
            thing: thingHandle
            root: consumes slot0

        recipe B
          thingHandle: ${options.fateB ? `${options.fateB}` : `?`}
          P2
            ${options.fateB ? 'thing: thingHandle' : ''}
            ${options.outThingB ? 'outThing: thingHandle' : ''}
      `;
    };

    const expectSuccessData = [
      {fateA: 'map'},
      {fateA: 'map', fateB: 'map'},
      {fateA: 'map', fateB: 'use'},
      {fateA: 'map', fateB: '?'},
      {fateA: 'copy'},
      {fateA: 'copy', fateB: 'map'},
      {fateA: 'copy', fateB: 'copy'},
      {fateA: 'use', fateB: 'use'},
      {fateA: 'use', fateB: 'use', outThingB: true},
      {fateA: 'use', fateB: '?'},
      {fateA: 'use', fateB: '?', outThingB: true},
      {fateA: 'create'},
      {fateA: 'create', fateB: '?'},
      {fateA: 'create', fateB: 'use'},
      {fateA: 'create', fateB: 'use', outThingB: true}
    ];

    for (const setup of expectSuccessData) {
      it(`parse with options: ${JSON.stringify(setup)}`, async () => {
        await doCoalesceRecipes(await parseManifest(setup));
      });
    }

    const expectFailureData = [
      {fateA: 'map', fateB: 'use', outThingB: true},
      {fateA: 'map', fateB: 'copy'},
      {fateA: 'copy', fateB: 'create'},
      {fateA: 'use', fateB: 'create'},
      {fateA: 'use', fateB: 'map'},
      {fateA: 'use', fateB: 'copy'},
      {fateA: 'create', fateB: 'create'},
      {fateA: 'create', fateB: 'map'},
      {fateA: 'create', fateB: 'copy'}
    ];
    for (const setup of expectFailureData) {
      it(`parse with options: ${JSON.stringify(setup)}`, async () => {
        await doNotCoalesceRecipes(await parseManifest(setup));
      });
    }
  });

  it('coalesces multiple handles', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing1
      schema Thing2
      schema Thing3
      particle P1
        thing1: reads Thing1
        thing2: reads [Thing2]
        thing3: reads BigCollection<Thing3>
      particle P2
        thing1: writes Thing1
        thing2: writes [Thing2]
        thing3: writes BigCollection<Thing3>
      recipe
        handle1: use *
        handle2: use *
        handle3: use *
        P1
          thing1: reads handle1
          thing2: reads handle2
          thing3: reads handle3
      recipe
        handle1: create *
        handle2: create *
        handle3: create *
        P2
          thing1: writes handle1
          thing2: writes handle2
          thing3: writes handle3
      `);
    assert.lengthOf(recipe.handles, 3);
    recipe.handles.forEach(handle => assert.lengthOf(handle.connections, 2));
  });

  it('coalesces multiple handles while coalescing slots', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing1
      schema Thing2
      particle P1
        root: consumes Slot
          action: provides? Slot
        thing1: reads writes Thing1
        thing2: reads writes Thing2
      particle P2
        action: consumes Slot
        thing1: reads writes Thing1
        thing2: reads writes Thing2
      recipe
        handle1: create *
        handle2: create *
        P2
          thing1: handle1
          thing2: handle2
      recipe
        handle1: create *
        handle2: create *
        slot0: slot 'rootslot-0'
        P1
          thing1: handle1
          thing2: handle2
          root: consumes slot0
      `, {skipUnresolved: true});
    assert.lengthOf(recipe.handles, 2);
    recipe.handles.forEach(handle => assert.lengthOf(handle.connections, 2));
  });

  it('coalesces recipe descriptions', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing
      particle P1
        inThing: reads Thing
      recipe
        inHandle: ?
        P1
          inThing: reads inHandle
        description \`input thing\`
      particle P2
        outThing: writes Thing
      recipe
        outHandle: create *
        P2
          outThing: writes outHandle
        description \`output thing\`
    `);
    assert.isTrue(recipe.isResolved());
    assert.deepEqual(['input thing', 'output thing'], recipe.patterns);
  });

  it('coalesces for unresolved consume slots', async () => {
    await doCoalesceRecipes(`
      schema Thing
      particle P1
        outThing: writes Thing
        foo: consumes Slot
      recipe
        outHandle: create *
        P1
          outThing: writes outHandle
      particle P2
        root: consumes Slot
          foo: provides Slot
      recipe
        rootSlot: slot 'root-slot'
        P2
          root: consumes rootSlot
    `);
  });
});
