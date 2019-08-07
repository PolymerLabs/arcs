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

describe('recipe-selector', () => {
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
    const r = checkDefined(manifest.recipes[0]);
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
    const r = checkDefined(manifest.recipes[0]);
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
    const r = checkDefined(manifest.recipes[0]);
    assert.lengthOf(manifest.recipes, 1);
    assert.lengthOf(manifest.recipes[0].triggers, 2);
    assert.lengthOf(manifest.recipes[0].triggers[0], 2);
    assert.deepEqual(manifest.recipes[0].triggers[0], [['key1', 'value1'], ['key2', 'value2']]);
    assert.lengthOf(manifest.recipes[0].triggers[1], 1);
    assert.deepEqual(manifest.recipes[0].triggers[1][0], ['key3', 'value3']);
  });
}); 