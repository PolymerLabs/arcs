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
import {checkDefined} from '../../runtime/testing/preconditions.js';
import {Arc} from '../../runtime/arc.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Match, SimplePlanner} from '../simple-planner.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {Id, ArcId} from '../../runtime/id.js';
import {RecipeResolver} from '../../runtime/recipe/recipe-resolver.js';

describe('trigger parsing', () => {
  it('trigger annotations parse with one key-value pair', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    assert.lengthOf(manifest.recipes, 1);
    assert.lengthOf(manifest.recipes[0].triggers, 1);
    assert.lengthOf(manifest.recipes[0].triggers[0], 1);
    assert.deepEqual(manifest.recipes[0].triggers[0][0], ['key1', 'value1']);
  });
  it('trigger annotations parse with multipe key-value pairs', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
        key2 value2
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    assert.lengthOf(manifest.recipes, 1);
    assert.lengthOf(manifest.recipes[0].triggers, 1);
    assert.lengthOf(manifest.recipes[0].triggers[0], 2);
    assert.deepEqual(manifest.recipes[0].triggers[0], [['key1', 'value1'], ['key2', 'value2']]);
  });
  it('trigger annotations parse with multipe triggers on one recipe', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
        key2 value2
      @trigger
        key3 value3
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    assert.lengthOf(manifest.recipes, 1);
    assert.lengthOf(manifest.recipes[0].triggers, 2);
    assert.lengthOf(manifest.recipes[0].triggers[0], 2);
    assert.deepEqual(manifest.recipes[0].triggers[0], [['key1', 'value1'], ['key2', 'value2']]);
    assert.lengthOf(manifest.recipes[0].triggers[1], 1);
    assert.deepEqual(manifest.recipes[0].triggers[1][0], ['key3', 'value3']);
  });
  it('trigger value can have dots', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        app com.spotify.music
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    assert.lengthOf(manifest.recipes, 1);
    assert.lengthOf(manifest.recipes[0].triggers, 1);
    assert.lengthOf(manifest.recipes[0].triggers[0], 1);
    assert.deepEqual(manifest.recipes[0].triggers[0][0], ['app', 'com.spotify.music']);
  });
});

describe('simple planner', () => {
  const createArc = (context) => new Arc({
    id: ArcId.newForTest('test'),
    slotComposer: new SlotComposer(),
    loader: new Loader(),
    context
  });

  it('If no triggers are present, the table is empty', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const sp = new SimplePlanner(manifest.recipes);
    assert.lengthOf(sp.recipesByTrigger, 0);
  });
  it('accepts duplicate triggers', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
      @trigger
        key1 value1
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const sp = new SimplePlanner(manifest.recipes);
    assert.lengthOf(sp.recipesByTrigger, 2);
  });
  it('works with one trigger with one key-value pair and one recipe', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        root: consumes Slot
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const planner = new SimplePlanner(manifest.recipes);
    assert.lengthOf(planner.recipesByTrigger, 1);
    assert.deepEqual(planner.recipesByTrigger[0].trigger, [['key1', 'value1']]);
    assert.equal(planner.recipesByTrigger[0].recipe, recipe);
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    const resolved = await resolver.resolve(recipe);
    assert.deepEqual(await planner.plan(arc, [['key1', 'value1']]), resolved);
    assert.isNull(await planner.plan(arc, [['key2', 'value2']]));
  });
  it('works with one trigger with multipe key-value pairs and one recipe', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        root: consumes Slot
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
        key2 value2
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const planner = new SimplePlanner(manifest.recipes);
    assert.lengthOf(planner.recipesByTrigger, 1);
    assert.deepEqual(planner.recipesByTrigger[0].trigger, [['key1', 'value1'], ['key2', 'value2']]);
    assert.equal(planner.recipesByTrigger[0].recipe, recipe);
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    const resolved = await resolver.resolve(recipe);
    assert.deepEqual(await planner.plan(arc, [['key1', 'value1'], ['key2', 'value2']]), resolved);
    assert.isNull(await planner.plan(arc, [['key1', 'value1']]));
    assert.isNull(await planner.plan(arc, [['key2', 'value2']]));
    assert.isNull(await planner.plan(arc, [['key3', 'value3']]));
  });
  it('works with two triggers for one recipe', async () => {
     const manifest = await Manifest.parse(`
      particle P1
        root: consumes Slot
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      @trigger
        key1 value1
        key2 value2
      @trigger
        key3 value3
      recipe R
        P1
          foo: writes h
        P2
          bar: reads h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const planner = new SimplePlanner(manifest.recipes);
    assert.lengthOf(planner.recipesByTrigger, 2);
    assert.deepEqual(planner.recipesByTrigger[0].trigger, [['key1', 'value1'], ['key2', 'value2']]);
    assert.deepEqual(planner.recipesByTrigger[1].trigger, [['key3', 'value3']]);
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    const resolved = await resolver.resolve(recipe);
    assert.deepEqual(await planner.plan(arc, [['key1', 'value1'], ['key2', 'value2']]), resolved);
    assert.deepEqual(await planner.plan(arc, [['key3', 'value3']]), resolved);
    assert.deepEqual(await planner.plan(arc, [['key1', 'value1'], ['key3', 'value3']]), resolved);
    assert.isNull(await planner.plan(arc, [['key1', 'value1']]));
    assert.isNull(await planner.plan(arc, [['key1', 'value1'], ['key4', 'value4']]));
  });
  it('works with two recipes, one with a trigger', async () => {
     const manifest = await Manifest.parse(`
      particle P1
        root: consumes Slot
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      particle P3
        baz: reads Foo {}
      recipe R1
        P1
          foo: writes h
        P2
          bar: reads h
      @trigger
        key1 value1
      recipe R2
        P1
          foo: writes h
        P3
          baz: reads h
    `);
    const recipe = checkDefined(manifest.recipes[1]);
    assert.lengthOf(manifest.recipes, 2);
    const planner = new SimplePlanner(manifest.recipes);
    assert.lengthOf(planner.recipesByTrigger, 1);
    assert.equal(planner.recipesByTrigger[0].recipe, recipe);
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    const resolved = await resolver.resolve(recipe);
    assert.deepEqual(await planner.plan(arc, [['key1', 'value1']]), resolved);
  });
  it('works with two recipes, both with triggers, preserving recipe order', async () => {
     const manifest = await Manifest.parse(`
      particle P1
        root: consumes Slot
        foo: writes Foo {}
      particle P2
        bar: reads Foo {}
      particle P3
        baz: reads Foo {}
      @trigger
        key1 value1
        key2 value2
      recipe R1
        P1
          foo: writes h
        P2
          bar: reads h
      @trigger
        key3 value3
      recipe R2
        P1
          foo: writes h
        P3
          baz: reads h
    `);
    const recipe1 = checkDefined(manifest.recipes[0]);
    const recipe2 = checkDefined(manifest.recipes[1]);
    assert.lengthOf(manifest.recipes, 2);
    const planner = new SimplePlanner(manifest.recipes);
    assert.lengthOf(planner.recipesByTrigger, 2);
    assert.equal(planner.recipesByTrigger[0].recipe, recipe1);
    assert.equal(planner.recipesByTrigger[1].recipe, recipe2);
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    const resolved1 = await resolver.resolve(recipe1);
    const resolved2 = await resolver.resolve(recipe2);
    assert.deepEqual(await planner.plan(arc, [['key1', 'value1'], ['key2', 'value2']]), resolved1);
    assert.deepEqual(await planner.plan(arc, [['key3', 'value3']]), resolved2);
    assert.isNull(await planner.plan(arc, [['key1', 'value1']]));
  });
});
