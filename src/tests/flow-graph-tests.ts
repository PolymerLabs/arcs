/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Manifest} from '../runtime/manifest.js';
import {assert} from '../platform/chai-web.js';
import {FlowGraph} from '../dataflow/flow-graph.js';

async function buildFlowGraph(manifestContent: string): Promise<FlowGraph> {
  const manifest = await Manifest.parse(manifestContent);
  assert.lengthOf(manifest.recipes, 1);
  const recipe = manifest.recipes[0];
  assert(recipe.normalize(), 'Failed to normalize recipe.');
  assert(recipe.isResolved(), 'Recipe is not resolved.');
  return new FlowGraph(recipe);
}

describe('FlowGraph', () => {
  it('works with empty recipe', async () => {
    const graph = await buildFlowGraph(`
      recipe R
    `);
    assert.isEmpty(graph.particleMap);
    assert.isEmpty(graph.handles);
  });

  it('works with single particle', async () => {
    const graph = await buildFlowGraph(`
      particle P
      recipe R
        P
    `);
    assert.isEmpty(graph.handles);
    assert.hasAllKeys(graph.particleMap, ['P']);
    const node = graph.particleMap.get('P');
    assert.isEmpty(node.inEdges);
    assert.isEmpty(node.outEdges);
  });

  it('works with two particles', async () => {
    const graph = await buildFlowGraph(`
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
    assert.lengthOf(graph.particles, 2);
    assert.lengthOf(graph.handles, 1);
    assert.hasAllKeys(graph.particleMap, ['P1', 'P2']);
    const P1 = graph.particleMap.get('P1');
    const P2 = graph.particleMap.get('P2');
    assert.isEmpty(P1.inEdges);
    assert.isEmpty(P2.outEdges);
    assert.equal(P1.outNodes[0], P2.inNodes[0], 'handle node is different');
    assert.sameMembers(graph.connections, ['P1.foo -> P2.bar']);
  });

  it('works with handles with multiple inputs', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
      particle P2
        out Foo {} bar
      particle P3
        in Foo {} baz
      recipe R
        P1
          foo -> h
        P2
          bar -> h
        P3
          baz <- h
    `);
    assert.hasAllKeys(graph.particleMap, ['P1', 'P2', 'P3']);
    assert.sameMembers(graph.connections, ['P1.foo -> P3.baz', 'P2.bar -> P3.baz']);
  });

  it('works with handles with multiple outputs', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
      particle P3
        in Foo {} baz
      recipe R
        P1
          foo -> h
        P2
          bar <- h
        P3
          baz <- h
    `);
    assert.hasAllKeys(graph.particleMap, ['P1', 'P2', 'P3']);
    assert.sameMembers(graph.connections, ['P1.foo -> P2.bar', 'P1.foo -> P3.baz']);
  });
});
