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
import {Manifest} from '../../runtime/manifest.js';
import {TypeGraph} from '../schema2graph.js';


describe('schema2graph', () => {
  it('creates nodes from every (particle, connection) combination', async () => {
      const manifest = await Manifest.parse(`
      particle Foo
        inout Data Thing {Text t, Number n} input1
        in Object Data Thing {Text t, Number n, URL b} input2
        out [Data {Number n, Text t}] output1
        out [* {Number n, URL b}] output2`);

      const graph = new TypeGraph.Builder().from(manifest).build();

      assert.containsAllKeys(graph.nodes, ['Foo_input1', 'Foo_input2', 'Foo_output1', 'Foo_output2']);
  });

  it(`doesn't create nodes for non-handles`, async () => {
    const manifest = await Manifest.parse(`
      particle Bar
        in Object Data Thing {Text t, Number n, URL b} input2
        consume root
          provide baz
        out [* {Number n, URL b}] output2`);

    const graph = new TypeGraph.Builder().from(manifest).build();

    const namesContain = (name: string): boolean => Object.keys(graph.nodes).some((key: string) => key.includes(name));

    assert.isFalse(graph.contains('Bar_root'));
    assert.isFalse(graph.contains('Bar_baz'));
    assert.isTrue(graph.contains('Bar_output2'));
    assert.isFalse(namesContain('root'));
    assert.isFalse(namesContain('baz'));
    assert.isTrue(namesContain('output2'));
  });

  it('builds edges between handles according to the lattice constraints', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        inout Data Thing {Text t, Number n} input1
        in Object Data Thing {Text t, Number n, URL b} input2
        out [Data {Number n, Text t}] output1
        out [* {Number n, URL b}] output2`);

    const graph = new TypeGraph.Builder().from(manifest).build();

    assert.isTrue(graph.edges['Foo_input1'].includes('Foo_output1'));
    assert.isFalse(graph.edges['Foo_input1'].includes('Foo_input1'));
    assert.isFalse(graph.edges['Foo_input1'].includes('Foo_input2'));
    assert.isFalse(graph.edges['Foo_input1'].includes('Foo_output2'));
    assert.includeMembers(graph.edges['Foo_input2'], ['Foo_output1', 'Foo_output2', 'Foo_input1']);
    assert.isFalse(graph.edges['Foo_input2'].includes('Foo_input2'));
    assert.isEmpty(graph.edges['Foo_output1']);
    assert.isEmpty(graph.edges['Foo_output2']);
  });
});
