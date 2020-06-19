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

const ktUtils = new KotlinGenerationUtils();

describe('kotlin-generations-utils', () => {
  describe('mapOf', () => {
    it('creates an empty map when no items are present', () => {
      const actual = ktUtils.mapOf([]);
      assert.strictEqual('emptyMap()', actual);
    });
    it('creates a single-line map when one item is present', () => {
      const actual = ktUtils.mapOf([`"a" to "b"`]);
      assert.strictEqual('mapOf("a" to "b")', actual);
    });
    it('creates a single-line map when few items are present', () => {
      const actual = ktUtils.mapOf([`"a" to "b"`, `"b" to "c"`]);
      assert.strictEqual(`mapOf("a" to "b", "b" to "c")`, actual);
    });
    it('creates a multi-line map when many items are present', () => {
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
    it('creates a multi-line map of 3 spaces when many items are present and preferences are updated', () => {
      const ktUtils = new KotlinGenerationUtils({indent: 3, lineLength: 120});
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
    it('creates a multi-line map due to starting indent', () => {
      const actual = ktUtils.mapOf([
        `"a" to "b"`,
        `"b" to "c"`,
      ], 90);
      assert.strictEqual(`\
mapOf(
    "a" to "b",
    "b" to "c"
)`, actual);
    });
  });
  describe('applyFun', () => {
    it('invokes the function in one line if possible', () => {
      assert.equal(
        ktUtils.applyFun('function', ['argument1', 'argument2', 'argument3']),
        'function(argument1, argument2, argument3)'
      );
    });
    it('invokes the function in multiple lines due to function name length', () => {
      assert.equal(
        ktUtils.applyFun('thisIsAVeryNonTrivialFunctionThatDoesABunchOfThingsForYouAndMeAndTheSociety', [
          'argument1', 'argument2', 'argument3'
        ]),
`thisIsAVeryNonTrivialFunctionThatDoesABunchOfThingsForYouAndMeAndTheSociety(
    argument1,
    argument2,
    argument3
)`
      );
    });
    it(`invokes the function in multiple lines due to arguments size`, () => {
      assert.equal(
        ktUtils.applyFun('function', [
          'argument1_argument1_argument1',
          'argument2_argument2_argument2',
          'argument3_argument3_argument3'
        ]),
`function(
    argument1_argument1_argument1,
    argument2_argument2_argument2,
    argument3_argument3_argument3
)`
      );
    });
    it(`accepts existing indent at a place of invocation`, () => {
      const numberOfIndents = 1;
      const startString = '\n' + ' '.repeat(ktUtils.pref.indent * numberOfIndents);
      assert.equal(
        startString + ktUtils.applyFun('function', [
          'argument1_argument1_argument1',
          'argument2_argument2_argument2',
          'argument3_argument3_argument3'
        ], {numberOfIndents}), `
    function(
        argument1_argument1_argument1,
        argument2_argument2_argument2,
        argument3_argument3_argument3
    )`
      );
    });
  });
  describe('indentFollowingLines', () => {
    it('indents only following lines', () => {
      assert.equal(`
        ${ktUtils.indentFollowing(['foo', 'bar', 'baz'], 2)}
            ${ktUtils.indentFollowing(['abc', 'def'], 3)}
        ${ktUtils.indentFollowing(['yay'], 2)}
      `, `
        foo
        bar
        baz
            abc
            def
        yay
      `);
    });
  });
});
