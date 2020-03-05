/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-node.js';
import {KotlinGenerationUtils} from '../kotlin-generation-utils.js';

describe('kotlin-generations-utils', () => {
  const ktUtils = new KotlinGenerationUtils();
  describe('mapOf', () => {
    it('when no items are present, it creates an empty map', () => {
      const actual = ktUtils.mapOf([]);
      assert.strictEqual('emptyMap()', actual);
    });
    it('when one item is present, it creates a single-line map', () => {
      const actual = ktUtils.mapOf([`"a" to "b"`]);
      assert.strictEqual('mapOf("a" to "b")', actual);
    });
    it('when few items are present, it creates a single-line map', () => {
      const actual = ktUtils.mapOf([`"a" to "b"`, `"b" to "c"`]);
      assert.strictEqual(`mapOf("a" to "b", "b" to "c")`, actual);
    });
    it('when many items are present, it creates a multi-line map', () => {
      const actual = ktUtils.mapOf([
        `"a" to "b"`,
        `"b" to "c"`,
        `"c" to "d"`,
        `"d" to "e"`,
        `"e" to "f"`,
        `"f" to "g"`,
        `"g" to "h"`,
        `"h" to "i"`,
        `"i" to "j"`,
        `"j" to "k"`,
        `"k" to "l"`,
      ]);
      assert.strictEqual(`\
mapOf(
    "a" to "b",
    "b" to "c",
    "c" to "d",
    "d" to "e",
    "e" to "f",
    "f" to "g",
    "g" to "h",
    "h" to "i",
    "i" to "j",
    "j" to "k",
    "k" to "l"
)`, actual);
    });
  });
});
