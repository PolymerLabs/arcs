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
import {Manifest} from '../../runtime/manifest.js';
import {Match, RecipeSelector} from '../recipe-selector.js';

describe('trigger parsing', () => {
  it('trigger annotations parse with one key-value pair', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
      recipe R
        P1
          foo -> h
        P2
          bar <- h
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
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
        key2 value2
      recipe R
        P1
          foo -> h
        P2
          bar <- h
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
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
        key2 value2
      @trigger
        key3 value3
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    assert.lengthOf(manifest.recipes, 1);
    assert.lengthOf(manifest.recipes[0].triggers, 2);
    assert.lengthOf(manifest.recipes[0].triggers[0], 2);
    assert.deepEqual(manifest.recipes[0].triggers[0], [['key1', 'value1'], ['key2', 'value2']]);
    assert.lengthOf(manifest.recipes[0].triggers[1], 1);
    assert.deepEqual(manifest.recipes[0].triggers[1][0], ['key3', 'value3']);
  });
});

describe('recipe-selector', () => {
  it('If no triggers are present, the table is empty', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const rs = new RecipeSelector(manifest.recipes);
    assert.lengthOf(rs.table, 0);
  });
  it('works with one trigger with one key-value pair and one recipe', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const rs = new RecipeSelector(manifest.recipes);
    assert.lengthOf(rs.table, 1);
    assert.deepEqual(rs.table[0].trigger, [['key1', 'value1']]);
    assert.equal(rs.table[0].recipe, recipe);
    assert.equal(rs.select([['key1', 'value1']]), recipe);
    assert.isNull(rs.select([['key2', 'value2']]));
  });
  it('Throws on duplicate triggers', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
      @trigger
        key1 value1
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    let threw = false;
    try {
      const rs = new RecipeSelector(manifest.recipes);
    } catch (e) {
      threw = true;
    }
    assert.isTrue(threw);
  });
  it('works with one trigger with multipe key-value pairs and one recipe', async () => {
    const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
        key2 value2
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const rs = new RecipeSelector(manifest.recipes);
    assert.lengthOf(rs.table, 1);
    assert.deepEqual(rs.table[0].trigger, [['key1', 'value1'], ['key2', 'value2']]);
    assert.equal(rs.table[0].recipe, recipe);
    assert.equal(rs.select([['key1', 'value1'], ['key2', 'value2']]), recipe);
    assert.isNull(rs.select([['key1', 'value1']]));
    assert.isNull(rs.select([['key2', 'value2']]));
    assert.isNull(rs.select([['key3', 'value3']]));
  });
  it('works with two triggers for one recipe', async () => {
     const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      @trigger
        key1 value1
        key2 value2
      @trigger
        key3 value3
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const recipe = checkDefined(manifest.recipes[0]);
    const rs = new RecipeSelector(manifest.recipes);
    assert.lengthOf(rs.table, 2);
    assert.deepEqual(rs.table[0].trigger, [['key1', 'value1'], ['key2', 'value2']]);
    assert.deepEqual(rs.table[1].trigger, [['key3', 'value3']]);
    assert.equal(rs.select([['key1', 'value1'], ['key2', 'value2']]), recipe);
    assert.equal(rs.select([['key3', 'value3']]), recipe);
    assert.equal(rs.select([['key1', 'value1'], ['key3', 'value3']]), recipe);
    assert.isNull(rs.select([['key1', 'value1']]));
    assert.isNull(rs.select([['key1', 'value1'], ['key4', 'value4']]));
  });
  it('works with two recipes, one with a trigger', async () => {
     const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      particle P3
        in Foo {} baz
      recipe R1
        P1
          foo -> h
        P2
          bar <- h
      @trigger
        key1 value1
      recipe R2
        P1
          foo -> h
        P3
          baz <- h
    `);
    const recipe = checkDefined(manifest.recipes[1]);
    assert.lengthOf(manifest.recipes, 2);
    const rs = new RecipeSelector(manifest.recipes);
    assert.lengthOf(rs.table, 1);
    assert.equal(rs.table[0].recipe, recipe);    
    assert.equal(rs.select([['key1', 'value1']]), recipe);
  });
  it('works with two recipes, both with triggers, preserving recipe order', async () => {
     const manifest = await Manifest.parse(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      particle P3
        in Foo {} baz
      @trigger
        key1 value1
        key2 value2
      recipe R1
        P1
          foo -> h
        P2
          bar <- h
      @trigger
        key3 value3
      recipe R2
        P1
          foo -> h
        P3
          baz <- h
    `);
    const recipe1 = checkDefined(manifest.recipes[0]);
    const recipe2 = checkDefined(manifest.recipes[1]);
    assert.lengthOf(manifest.recipes, 2);
    const rs = new RecipeSelector(manifest.recipes);
    assert.lengthOf(rs.table, 2);
    assert.equal(rs.table[0].recipe, recipe1);
    assert.equal(rs.table[1].recipe, recipe2);
    assert.equal(rs.select([['key1', 'value1'], ['key2', 'value2']]), recipe1);
    assert.equal(rs.select([['key3', 'value3']]), recipe2);
    assert.isNull(rs.select([['key1', 'value1']]));
  });
}); 