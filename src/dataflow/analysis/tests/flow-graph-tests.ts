/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Manifest} from '../../../runtime/manifest.js';
import {assert} from '../../../platform/chai-web.js';
import {checkDefined} from '../../../runtime/testing/preconditions.js';
import {FlowGraph, Node, Edge, BackwardsPath} from '../flow-graph.js';
import {ClaimIsTag} from '../../../runtime/particle-claim.js';
import {CheckHasTag, CheckCondition} from '../../../runtime/particle-check.js';

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
    const claim = node.claims.get('foo') as ClaimIsTag;
    assert.equal(claim.handle.name, 'foo');
    assert.equal(claim.tag, 'trusted');
    assert.isEmpty(node.checks);

    assert.lengthOf(graph.edges, 1);
    assert.equal(graph.edges[0].claim, claim);
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
    const check = node.checks.get('foo');
    assert.equal(check.handle.name, 'foo');
    assert.lengthOf(check.conditions, 1);
    assert.equal((check.conditions[0] as CheckHasTag).tag, 'trusted');
    assert.isEmpty(node.claims);

    assert.lengthOf(graph.edges, 1);
    assert.equal(graph.edges[0].check, check);
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
    assert.sameMembers(result.failures, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
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
    assert.sameMembers(result.failures, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
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
    assert.sameMembers(result.failures, [`'check bar is trusted' failed for path: P2.foo -> P3.bar`]);
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
    assert.sameMembers(result.failures, [`'check bar is trusted' failed for path: P.bar`]);
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

  it('a claim made later in a chain of particles does not override claims made earlier', async () => {
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
    assert.isTrue(result.isValid);
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
    assert.sameMembers(result.failures, [`'check bar is tag1 or is tag2' failed for path: P2.foo -> P3.bar`]);
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
      `'check bar is trusted' failed for path: P1.foo -> P4.bar`,
      `'check bar is trusted' failed for path: P2.foo -> P4.bar`,
      `'check bar is trusted' failed for path: P3.foo -> P4.bar`,
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
      `'check bar1 is trusted' failed for path: P1.foo1 -> P2.bar1`,
      `'check bar2 is extraTrusted' failed for path: P1.foo2 -> P2.bar2`,
    ]);
  });

  describe(`'is from handle' check conditions`, () => {
    it('succeeds when the handle is exactly the same', async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input1
          in Foo {} input2
          check input2 is from handle input1
        recipe R
          P
            input1 <- h
            input2 <- h
      `);
      assert.isTrue(graph.validateGraph().isValid);
    });

    it('fails when handle is different', async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input1
          in Foo {} input2
          check input2 is from handle input1
        recipe R
          P
            input1 <- h1
            input2 <- h2
      `);
      const result = graph.validateGraph();
      assert.isFalse(result.isValid);
      assert.sameMembers(result.failures, [`'check input2 is from handle input1' failed for path: P.input2`]);
    });

    it('succeeds when the handle has inputs', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output1
          out Foo {} output2
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            output1 -> h
            output2 -> h
          P2
            trustedSource <- h
            inputToCheck <- h
      `);
      assert.isTrue(graph.validateGraph().isValid);
    });

    it('succeeds when the handle is separated by a chain of other particles', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Foo {} input
          out Foo {} output
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            input <- h
            output -> h1
          P2
            trustedSource <- h
            inputToCheck <- h1
      `);
      assert.isTrue(graph.validateGraph().isValid);
    });

    it('succeeds when the handle is separated by another particle with a claim', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Foo {} input
          out Foo {} output
          claim output is somethingElse
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            input <- h
            output -> h1
          P2
            trustedSource <- h
            inputToCheck <- h1
      `);
      assert.isTrue(graph.validateGraph().isValid);
    });

    it('fails when another handle is also found', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Foo {} input1
          in Foo {} input2
          out Foo {} output
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            input1 <- h
            input2 <- h1
            output -> h2
          P2
            trustedSource <- h
            inputToCheck <- h2
      `);
      const result = graph.validateGraph();
      assert.isFalse(result.isValid);
      assert.sameMembers(result.failures, [
        `'check inputToCheck is from handle trustedSource' failed for path: P1.input2 -> P1.output -> P2.inputToCheck`,
      ]);
    });
  });

  describe(`checks using the 'or' operator`, async () => {
    it('succeeds when only the handle is present', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource or is trusted
        recipe R
          P1
            output -> h
          P2
            trustedSource <- h
            inputToCheck <- h
      `);
      assert.isTrue(graph.validateGraph().isValid);
    });

    it('succeeds when only the tag is present', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
          claim output is trusted
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource or is trusted
        recipe R
          P1
            output -> h2
          P2
            trustedSource <- h
            inputToCheck <- h2
      `);
      assert.isTrue(graph.validateGraph().isValid);
    });

    it('fails when neither condition is present', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource or is trusted
        recipe R
          P1
            output -> h2
          P2
            trustedSource <- h
            inputToCheck <- h2
      `);
      const result = graph.validateGraph();
      assert.isFalse(result.isValid);
      assert.sameMembers(result.failures, [
        `'check inputToCheck is from handle trustedSource or is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    });
  });
});

class TestNode extends Node {
  readonly inEdges: TestEdge[] = [];
  readonly outEdges: TestEdge[] = [];
  
  addInEdge() {
    throw new Error('Unimplemented.');
  }

  addOutEdge() {
    throw new Error('Unimplemented.');
  }

  evaluateCheckCondition(condition: CheckCondition, edge: Edge): boolean {
    throw new Error('Unimplemented.');
  }

  inEdgesFromOutEdge(outEdge: Edge): readonly Edge[] {
    throw new Error('Unimplemented.');
  }
}

class TestEdge implements Edge {
  readonly handleName = 'handleName';

  constructor(
      readonly start: TestNode,
      readonly end: TestNode,
      readonly label: string) {}
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
