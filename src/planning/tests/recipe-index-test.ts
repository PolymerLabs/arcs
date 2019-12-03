/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../../runtime/arc.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {checkDefined} from '../../runtime/testing/preconditions.js';
import {RecipeIndex} from '../recipe-index.js';
import {Id, ArcId} from '../../runtime/id.js';
import {Flags} from '../../runtime/flags.js';

describe('RecipeIndex', () => {
  async function createIndex(manifestContent) {
    const manifest = await await Manifest.parse(manifestContent);
    for (const recipe of manifest.recipes) {
      assert(recipe.normalize());
    }
    const loader = new Loader();
    const arc = new Arc({
      id: ArcId.newForTest('test-plan-arc'),
      context: manifest,
      loader,
      slotComposer: new MockSlotComposer()
    });
    const recipeIndex = RecipeIndex.create(arc);
    await recipeIndex.ready;
    return recipeIndex;
  }

  async function extractIndexRecipeStrings(manifestContent) {
    return (await createIndex(manifestContent)).recipes.map(r => r.toString());
  }

  it('adds use handles', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema Person
      schema Lumberjack

      particle Transform
        person: reads Person
        lumberjack: writes Lumberjack

      recipe
        Transform
    `), [
`recipe
  handle0: ? // ~
  handle1: ? // ~
  Transform as particle0
    lumberjack: writes handle0
    person: reads handle1`
    ]);
  });

  it('matches free handles to connections', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema Person

      particle A
        person: reads writes Person

      recipe
        person: create
        A
    `), [
`recipe
  handle0: create // Person {}
  A as particle0
    person: reads writes handle0`
    ]);
  });

  it('resolves local slots, but not a root slot', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A
        root: consumes
          detail: provides
      particle B
        detail: consumes

      recipe
        A
          root: consumes
        B
    `), [
`recipe
  A as particle0
    root: consumes
      detail: provides slot0
  B as particle1
    detail: consumes slot0`
    ]);
  });

  it('resolves constraints', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema A
      schema B
      schema C

      particle Transform
        a: reads A
        b: writes B
      particle TransformAgain
        b: reads B
        c: writes C

      recipe
        Transform.b: writes TransformAgain.b
    `), [
`recipe
  handle0: ? // ~
  handle1: create // B {}
  handle2: ? // ~
  Transform as particle0
    a: reads handle0
    b: writes handle1
  TransformAgain as particle1
    b: reads handle1
    c: writes handle2`
    ]);
  });

  it('does not resolve verbs', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A &verb

      recipe
        &verb
    `), [
`recipe
  &verb`
    ]);
  });

  it('exposes multiple recipes', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A
      particle B

      recipe
        A
      recipe
        B
      recipe
        &verb
    `), [
`recipe
  A as particle0`,
`recipe
  B as particle0`,
`recipe
  &verb`
    ]);
  });

  it('finds matching handles by fate', async () => {
    const index = await createIndex(`
      schema Thing

      particle A
        thing: reads Thing
      recipe A
        thing: map
        A
          thing: thing

      particle B
        thing: writes Thing
      recipe B
        thing: create
        B
          thing: thing

      particle C
        thing: reads Thing
      recipe C
        thing: use
        C
          thing: thing
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'C'), 'missing recipe C');

    const handle = recipe.handles[0];

    assert.deepEqual(['A'], index.findHandleMatch(handle, ['map']).map(h => h.recipe.name));
    assert.deepEqual(['B'], index.findHandleMatch(handle, ['create']).map(h => h.recipe.name));
  });

  // TODO(jopra): Remove once slandles unification syntax is implemented.
  it('finds matching handles by fate', async () => {
    const index = await createIndex(`
      schema Thing

      particle A
        thing: reads Thing
      recipe A
        thing: map *
        A
          thing: thing

      particle B
        thing: writes Thing
      recipe B
        thing: create *
        B
          thing: thing

      particle C
        thing: reads Thing
      recipe C
        thing: use *
        C
          thing: thing
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'C'), 'missing recipe C');

    const handle = recipe.handles[0];

    assert.deepEqual(['A'], index.findHandleMatch(handle, ['map']).map(h => h.recipe.name));
    assert.deepEqual(['B'], index.findHandleMatch(handle, ['create']).map(h => h.recipe.name));
  });

  it('finds matching handle by type', async () => {
    const index = await createIndex(`
      schema Thing
      schema OtherThing

      particle ConsumerThing
        thing: reads Thing
      particle ProducerThing
        thing: writes Thing
      particle ProducerOtherThing
        thing: writes OtherThing

      recipe Selector
        thing: use *
        ConsumerThing

      recipe
        thing: create *
        ProducerThing

      recipe
        otherThing: create *
        ProducerOtherThing
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'Selector'), 'missing Selector');
    const handle = recipe.handles[0];

    assert.deepEqual(
        ['ProducerThing'],
        index.findHandleMatch(handle).map(h => h.recipe.particles[0].name));
  });

  it('finds matching handles by tags', async () => {
    const index = await createIndex(`
      schema Thing

      particle Consumer
        thing: reads Thing
      particle Producer
        thing: writes Thing

      recipe TakeMe1
        thing: create #loved
        Producer

      recipe TakeMe2
        thing: create #loved #adored
        Producer

      recipe TakeMe3
        thing: create #appreciated
        Producer

      recipe IgnoreMe
        thing: create #hated
        Producer

      recipe Selector
        thing: use #loved #appreciated
        Consumer
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'Selector'), 'missing Selector');
    const handle = recipe.handles[0];

    assert.deepEqual(
        ['TakeMe1', 'TakeMe2', 'TakeMe3'],
        index.findHandleMatch(handle).map(h => h.recipe.name));
  });

  it('finds tagged handles if selecting handle is not tagged', async () => {
    const index = await createIndex(`
      schema Thing

      particle Consumer
        thing: reads Thing
      particle Producer
        thing: writes Thing

      recipe TakeMe1
        thing: create #loved
        Producer

      recipe TakeMe2
        thing: create #hated
        Producer

      recipe Selector
        thing: use *
        Consumer
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'Selector'), 'Missing Selector');
    const handle = recipe.handles[0];

    assert.deepEqual(
        ['TakeMe1', 'TakeMe2'],
        index.findHandleMatch(handle).map(h => h.recipe.name));
  });

  it('matching use/create handle pairs require communication', async () => {
    const index = await createIndex(`
      schema Thing

      particle Consumer1
        thing: reads Thing
      particle Consumer2
        thing: reads Thing
      particle Producer
        thing: writes Thing
      particle ProducerConsumer
        thing: reads writes Thing

      recipe Selector
        thing: use *
        Consumer1

      recipe
        thing: create *
        Consumer2

      recipe
        thing: create *
        Producer

      recipe
        thing: create *
        ProducerConsumer
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'Selector'), 'Missing Selector');
    const handle = recipe.handles[0];

    assert.deepEqual(
        ['Producer', 'ProducerConsumer'],
        index.findHandleMatch(handle).map(h => h.recipe.particles[0].name));
  });

  it('matching use/copy handle pairs do not require communication', async () => {
    const index = await createIndex(`
      schema Thing

      particle Consumer1
        thing: reads Thing
      particle Consumer2
        thing: reads Thing
      particle Producer
        thing: writes Thing
      particle ProducerConsumer
        thing: reads writes Thing

      recipe Selector
        thing: use *
        Consumer1

      recipe
        g: copy *
        Consumer2

      recipe
        g: copy *
        Producer

      recipe
        g: copy *
        ProducerConsumer
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'Selector'), 'missing Selector');
    const handle = recipe.handles[0];

    assert.deepEqual(
        ['Consumer2', 'Producer', 'ProducerConsumer'],
        index.findHandleMatch(handle).map(h => h.recipe.particles[0].name));
  });
});
