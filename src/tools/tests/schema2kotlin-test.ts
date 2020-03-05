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
import {KotlinGenerator} from '../schema2kotlin.js';
import {SchemaNode} from '../schema2graph.js';
import {Schema} from '../../runtime/schema.js';


describe('schema2wasm', () => {
  describe('kotlin-generator', () => {
    const ktGen = new KotlinGenerator(new SchemaNode(new Schema([], {}), 'dummyNode'), {arg: '', _: []});
    it('when no items are present, it creates an empty map', () => {
      const actual = ktGen.mapOf([]);

      assert.strictEqual('emptyMap()', actual);
    });
    it('when one item is present, it creates a single-line map', () => {
      const actual = ktGen.mapOf([`"a" to "b"`]);

      assert.strictEqual('mapOf("a" to "b")', actual);
    });
    it('when multiple items are present, it creates a multi-line map', () => {
      const actual = ktGen.mapOf([`"a" to "b"`, `"b" to "c"`]);

      assert.strictEqual(`\
mapOf(
    "a" to "b",
    "b" to "c"
)`, actual);
    });
  });
});
