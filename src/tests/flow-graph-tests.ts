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
import {checkDefined} from '../runtime/testing/preconditions.js';
import {FlowGraph, Node, Edge, CheckResult, CheckResultType, BackwardsPath, Check} from '../dataflow/flow-graph.js';

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
    const node = checkDefined(graph.particleMap.get('P'));
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
    const P1 = checkDefined(graph.particleMap.get('P1'));
    const P2 = checkDefined(graph.particleMap.get('P2'));
    assert.isEmpty(P1.inEdges);
    assert.isEmpty(P2.outEdges);
    assert.equal(P1.outNodes[0], P2.inNodes[0], 'handle node is different');
    assert.sameMembers(graph.connectionsAsStrings, ['P1.foo -> P2.bar']);
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
    assert.sameMembers(graph.connectionsAsStrings, ['P1.foo -> P3.baz', 'P2.bar -> P3.baz']);
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
    assert.sameMembers(graph.connectionsAsStrings, ['P1.foo -> P2.bar', 'P1.foo -> P3.baz']);
  });

  it('copies particle claims to particle nodes and out-edges', async () => {
    const graph = await buildFlowGraph(`
      particle P
        out Foo {} foo
        claim foo is trusted
      recipe R
        P
          foo -> h
    `);
    const node = checkDefined(graph.particleMap.get('P'));
    assert.equal(node.claims.size, 1);
    assert.equal(node.claims.get('foo'), 'trusted');
    assert.isEmpty(node.checks);

    assert.lengthOf(graph.edges, 1);
    assert.equal(graph.edges[0].claim, 'trusted');
  });

  it('copies particle checks to particle nodes and in-edges', async () => {
    const graph = await buildFlowGraph(`
      particle P
        in Foo {} foo
        check foo is trusted
      recipe R
        P
          foo <- h
    `);
    const node = checkDefined(graph.particleMap.get('P'));
    assert.equal(node.checks.size, 1);
    assert.deepEqual(node.checks.get('foo'), new Check(['trusted']));
    assert.isEmpty(node.claims);

    assert.lengthOf(graph.edges, 1);
    assert.deepEqual(graph.edges[0].check, new Check(['trusted']));
  });
});

describe('FlowGraph validation', () => {
  it('succeeds when there are no checks', async () => {
    const graph = await buildFlowGraph(`
      particle P
        out Foo {} foo
        claim foo is trusted
      recipe R
        P
          foo -> h
    `);
    assert.isTrue(graph.validateGraph().isValid);
  });

  it('succeeds when a check is satisfied directly', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    assert.isTrue(graph.validateGraph().isValid);
  });

  it('fails when a different tag is claimed', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is notTrusted
      particle P2
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [`Check 'trusted' failed: found claim 'notTrusted' on 'P1.foo' instead.`]);
  });

  it('fails when no tag is claimed', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
      particle P2
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [`Check 'trusted' failed: found untagged node.`]);
  });

  it('succeeds when handle has multiple inputs with the right tags', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        out Foo {} foo
        claim foo is trusted
      particle P3
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          foo -> h
        P3
          bar <- h
    `);
    assert.isTrue(graph.validateGraph().isValid);
  });

  it('fails when handle has multiple inputs but one is untagged', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        out Foo {} foo
      particle P3
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          foo -> h
        P3
          bar <- h
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [`Check 'trusted' failed: found untagged node.`]);
  });

  it('fails when handle has no inputs', async () => {
    const graph = await buildFlowGraph(`
      particle P
        in Foo {} bar
        check bar is trusted
      recipe R
        P
          bar <- h
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [`Check 'trusted' failed: found untagged node.`]);
  });

  it('claim propagates through a chain of particles', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        in Foo {} bar
        out Foo {} foo
      particle P3
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h1
        P2
          bar <- h1
          foo -> h2
        P3
          bar <- h2
    `);
    assert.isTrue(graph.validateGraph().isValid);
  });

  it('a claim made later in a chain of particles clobbers claims made earlier', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        in Foo {} bar
        out Foo {} foo
        claim foo is someOtherTag
      particle P3
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h1
        P2
          bar <- h1
          foo -> h2
        P3
          bar <- h2
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [`Check 'trusted' failed: found claim 'someOtherTag' on 'P2.foo' instead.`]);
  });

  it('succeeds when a check includes multiple tags', async () => {
    const graph = await buildFlowGraph(`
    particle P1
      out Foo {} foo
      claim foo is tag1
    particle P2
      out Foo {} foo
      claim foo is tag2
    particle P3
      in Foo {} bar
      check bar is tag1 or is tag2
    recipe R
      P1
        foo -> h
      P2
        foo -> h
      P3
        bar <- h
    `);
    const result = graph.validateGraph();
    assert.isTrue(result.isValid);
  });

  it(`fails when a check including multiple tags isn't met`, async () => {
    const graph = await buildFlowGraph(`
    particle P1
      out Foo {} foo
      claim foo is tag1
    particle P2
      out Foo {} foo
      claim foo is someOtherTag
    particle P3
      in Foo {} bar
      check bar is tag1 or is tag2
    recipe R
      P1
        foo -> h
      P2
        foo -> h
      P3
        bar <- h
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [`Check 'tag1|tag2' failed: found claim 'someOtherTag' on 'P2.foo' instead.`]);
  });

  it('can detect more than one failure for the same check', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is notTrusted
      particle P2
        out Foo {} foo
        claim foo is someOtherTag
      particle P3
        out Foo {} foo
      particle P4
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          foo -> h
        P3
          foo -> h
        P4
          bar <- h
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [
      `Check 'trusted' failed: found claim 'notTrusted' on 'P1.foo' instead.`,
      `Check 'trusted' failed: found claim 'someOtherTag' on 'P2.foo' instead.`,
      `Check 'trusted' failed: found untagged node.`,
    ]);
  });

  it('can detect failures for different checks', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo1
        out Foo {} foo2
        claim foo1 is notTrusted
        claim foo2 is trusted
      particle P2
        in Foo {} bar1
        in Foo {} bar2
        check bar1 is trusted
        check bar2 is extraTrusted
      recipe R
        P1
          foo1 -> h1
          foo2 -> h2
        P2
          bar1 <- h1
          bar2 <- h2
    `);
    const result = graph.validateGraph();
    assert.isFalse(result.isValid);
    assert.sameMembers(result.failures, [
      `Check 'trusted' failed: found claim 'notTrusted' on 'P1.foo1' instead.`,
      `Check 'extraTrusted' failed: found claim 'trusted' on 'P1.foo2' instead.`,
    ]);
  });
});

class TestNode extends Node {
  readonly inEdges: TestEdge[] = [];
  readonly outEdges: TestEdge[] = [];
  
  evaluateCheck(check: Check, edge: Edge): CheckResult {
    return {type: CheckResultType.Success};
  }
}

class TestEdge implements Edge {
  readonly handleName = 'handleName';

  constructor(
      readonly start: TestNode,
      readonly end: TestNode,
      readonly label: string) {}
  
  evaluateCheck(check: Check, path: BackwardsPath): CheckResult {
    return {type: CheckResultType.Success};
  }
}

describe('BackwardsPath', () => {
  // Construct directed graph: A -> B -> C.
  const nodeA = new TestNode();
  const nodeB = new TestNode();
  const nodeC = new TestNode();
  const edgeAToB = new TestEdge(nodeA, nodeB, 'A -> B');
  const edgeBToC = new TestEdge(nodeB, nodeC, 'B -> C');
  const edgeCToA = new TestEdge(nodeC, nodeA, 'C -> A');

  it('starts with a single edge', () => {
    const path = BackwardsPath.fromEdge(edgeAToB);

    assert.sameOrderedMembers(path.nodes as Node[], [nodeB, nodeA]);
    assert.equal(path.startNode, nodeB);
    assert.equal(path.endNode, nodeA);
    assert.equal(path.endEdge, edgeAToB);
  });

  it('can add another edge to the end of the path', () => {
    let path = BackwardsPath.fromEdge(edgeBToC);
    path = path.withNewEdge(edgeAToB);

    assert.sameOrderedMembers(path.nodes as Node[], [nodeC, nodeB, nodeA]);
    assert.equal(path.startNode, nodeC);
    assert.equal(path.endNode, nodeA);
    assert.equal(path.endEdge, edgeAToB);
  });

  it('forbids cycles', () => {
    let path = BackwardsPath.fromEdge(edgeBToC);
    path = path.withNewEdge(edgeAToB);
    assert.throws(() => path.withNewEdge(edgeCToA), 'Graph must not include cycles');
  });

  it('only allows adding to the end of the path', () => {
    const path = BackwardsPath.fromEdge(edgeBToC);
    assert.throws(() => path.withNewEdge(edgeCToA), 'Edge must connect to end of path');
  });
});
