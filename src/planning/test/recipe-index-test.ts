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
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {checkDefined} from '../../runtime/testing/preconditions.js';
import {RecipeIndex} from '../recipe-index.js';
import {Id, ArcId} from '../../runtime/id.js';

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
        in Person person
        out Lumberjack lumberjack

      recipe
        Transform
    `), [
`recipe
  ? as handle0 // ~
  ? as handle1 // ~
  Transform as particle0
    lumberjack -> handle0
    person <- handle1`
    ]);
  });

  it('matches free handles to connections', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema Person

      particle A
        inout Person person

      recipe
        create as person
        A
    `), [
`recipe
  create as handle0 // Person {}
  A as particle0
    person = handle0`
    ]);
  });

  it('resolves local slots, but not a root slot', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A
        consume root
          provide detail
      particle B
        consume detail

      recipe
        A
          consume root
        B
    `), [
`recipe
  A as particle0
    consume root
      provide detail as slot0
  B as particle1
    consume detail as slot0`
    ]);
  });

  it('resolves constraints', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema A
      schema B
      schema C

      particle Transform
        in A a
        out B b
      particle TransformAgain
        in B b
        out C c

      recipe
        Transform.b -> TransformAgain.b
    `), [
`recipe
  ? as handle0 // ~
  create as handle1 // B {}
  ? as handle2 // ~
  Transform as particle0
    a <- handle0
    b -> handle1
  TransformAgain as particle1
    b <- handle1
    c -> handle2`
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
        in Thing thing
      recipe A
        map as thing
        A
          thing = thing

      particle B
        out Thing thing
      recipe B
        create as thing
        B
          thing = thing

      particle C
        in Thing thing
      recipe C
        use as thing
        C
          thing = thing
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
        in Thing thing
      particle ProducerThing
        out Thing thing
      particle ProducerOtherThing
        out OtherThing thing

      recipe Selector
        use as thing
        ConsumerThing

      recipe
        create as thing
        ProducerThing

      recipe
        create as otherThing
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
        in Thing thing
      particle Producer
        out Thing thing

      recipe TakeMe1
        create #loved as thing
        Producer

      recipe TakeMe2
        create #loved #adored as thing
        Producer

      recipe TakeMe3
        create #appreciated as thing
        Producer

      recipe IgnoreMe
        create #hated as thing
        Producer

      recipe Selector
        use #loved #appreciated as thing
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
        in Thing thing
      particle Producer
        out Thing thing

      recipe TakeMe1
        create #loved as thing
        Producer

      recipe TakeMe2
        create #hated as thing
        Producer

      recipe Selector
        use as thing
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
        in Thing thing
      particle Consumer2
        in Thing thing
      particle Producer
        out Thing thing
      particle ProducerConsumer
        inout Thing thing

      recipe Selector
        use as thing
        Consumer1

      recipe
        create as thing
        Consumer2

      recipe
        create as thing
        Producer

      recipe
        create as thing
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
        in Thing thing
      particle Consumer2
        in Thing thing
      particle Producer
        out Thing thing
      particle ProducerConsumer
        inout Thing thing

      recipe Selector
        use as thing
        Consumer1

      recipe
        copy as thing
        Consumer2

      recipe
        copy as thing
        Producer

      recipe
        copy as thing
        ProducerConsumer
    `);

    const recipe = checkDefined(index.recipes.find(r => r.name === 'Selector'), 'missing Selector');
    const handle = recipe.handles[0];

    assert.deepEqual(
        ['Consumer2', 'Producer', 'ProducerConsumer'],
        index.findHandleMatch(handle).map(h => h.recipe.particles[0].name));
  });
});
