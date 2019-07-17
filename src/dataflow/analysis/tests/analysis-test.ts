/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../platform/chai-web.js';
import {validateGraph, ValidationResult, Solver, EdgeExpression} from '../analysis.js';
import {buildFlowGraph, TestEdge, TestNode} from '../testing/flow-graph-testing.js';
import {assertThrowsAsync} from '../../../runtime/testing/test-util.js';
import {FlowSet, Flow, FlowModifier, TagOperation, FlowModifierSet} from '../graph-internals.js';

/** Checks that the given ValidationResult failed with the expected failure messages. */
function assertFailures(result: ValidationResult, expectedFailures: string[]) {
  assert.isFalse(result.isValid);

  // TODO: Restore the ability of reporting the path where the check failed.
  // For now, we will remove the path from each expected failure message.
  const expectedFailuresWithoutPaths: Set<string> = new Set();
  for (const expected of expectedFailures) {
    const index = expected.indexOf(' for path:');
    assert(index !== -1, 'Expected failure message is not of the right format.');
    expectedFailuresWithoutPaths.add(expected.slice(0, index));
  }

  assert.sameMembers([...result.failures], [...expectedFailuresWithoutPaths]);
}

/**
 * Creates test nodes and edges in a chain, using the given node IDs. e.g.
 * createChainOfEdges('A', 'B', 'C') will return an array of two edges: AB, BC.
 */
function createChainOfEdges(...nodeIds: string[]) {
  assert(nodeIds.length >= 2);
  const nodes = nodeIds.map(nodeId => new TestNode(nodeId));
  const edges: TestEdge[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const firstNode = nodes[i - 1];
    const secondNode = nodes[i];
    edges.push(new TestEdge(firstNode, secondNode, firstNode.nodeId + '->' + secondNode.nodeId));
  }
  return edges;
}

// FlowModifier constants.
const addsTagT1 = new FlowModifier();
addsTagT1.tagOperations.set('t1', TagOperation.Add);

const addsTagT2 = new FlowModifier();
addsTagT2.tagOperations.set('t2', TagOperation.Add);

const addsTagsT1AndT2 = addsTagT1.copyAndModify(addsTagT2);

const removesTagT1 = new FlowModifier();
removesTagT1.tagOperations.set('t1', TagOperation.Remove);

describe('EdgeExpression', () => {
  it('can construct an edge with no parents and no modifier', () => {
    const [edge] = createChainOfEdges('A', 'B');
    const expression = new EdgeExpression(edge);

    assert.strictEqual(expression.edge, edge);
    assert.isTrue(expression.isResolved);
    assert.isEmpty(expression.unresolvedFlows);
    assert.isEmpty(expression.parents);

    const expectedFlowSet = new FlowSet();
    expectedFlowSet.add(new Flow());
    assert.deepEqual(expression.resolvedFlows, expectedFlowSet);

    assert.equal(expression.toString(), `EdgeExpression(A->B) {
  {}
}`);
  });

  it('can construct an edge with no parents and a modifier', () => {
    const [edge] = createChainOfEdges('A', 'B');
    edge.modifier = addsTagT1;
    const expression = new EdgeExpression(edge);

    assert.isTrue(expression.isResolved);
    assert.isEmpty(expression.unresolvedFlows);
    assert.isEmpty(expression.parents);

    const flow = new Flow();
    flow.tags.add('t1');
    assert.deepEqual(expression.resolvedFlows, new FlowSet(flow));

    assert.equal(expression.toString(), `EdgeExpression(A->B) {
  {tag:t1}
}`);
  });

  it('can construct an edge with parent and a modifier', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');

    edge.modifier = addsTagT1;
    const expression = new EdgeExpression(edge);

    assert.isFalse(expression.isResolved);
    assert.equal(expression.resolvedFlows.size, 0);
    assert.hasAllKeys(expression.unresolvedFlows, [parentEdge]);
    assert.deepEqual(expression.unresolvedFlows.get(parentEdge), new FlowModifierSet(addsTagT1));
    assert.sameMembers(expression.parents, [parentEdge]);

    assert.equal(expression.toString(), `EdgeExpression(B->C) {
  EdgeExpression(A->B) + {+tag:t1}
}`);
  });

  it('can substitute a resolved parent', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
    parentEdge.modifier = addsTagT1;
    edge.modifier = addsTagT2;
    const parentExpression = new EdgeExpression(parentEdge);
    const expression = new EdgeExpression(edge);
    
    expression.expandParent(parentExpression);
    
    assert.isTrue(expression.isResolved);
    assert.deepEqual(expression.resolvedFlows, new FlowSet(addsTagsT1AndT2.toFlow()));
  });

  it('can substitute an unresolved parent', () => {
    const [grandparentEdge, parentEdge, edge] = createChainOfEdges('A', 'B', 'C', 'D');
    parentEdge.modifier = addsTagT1;
    edge.modifier = addsTagT2;
    const parentExpression = new EdgeExpression(parentEdge);
    const expression = new EdgeExpression(edge);    
    
    expression.expandParent(parentExpression);
    
    assert.isFalse(expression.isResolved);
    assert.hasAllDeepKeys(expression.unresolvedFlows, grandparentEdge);
    assert.deepEqual(expression.unresolvedFlows.get(grandparentEdge), new FlowModifierSet(addsTagsT1AndT2));
  });

  it('can depend on a parent with multiple different modifiers', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
    edge.modifier = addsTagT1;
    const expression = new EdgeExpression(edge);

    // Add another modifier manually. This could have come from expanding
    // another parent, for instance.
    expression.unresolvedFlows.get(parentEdge).add(addsTagT2);

    expression.expandParent(new EdgeExpression(parentEdge));
    assert.isTrue(expression.isResolved);
    assert.deepEqual(expression.resolvedFlows, new FlowSet(addsTagT1.toFlow(), addsTagT2.toFlow()));
  });
  
  it('can depend on a grandparent with multiple different modifiers', () => {
    const [grandparentEdge, parentEdge1, edge] = createChainOfEdges('A', 'B', 'C', 'D');
    const parentEdge2 = new TestEdge(parentEdge1.start, parentEdge1.end, 'BC2');
    parentEdge1.modifier = addsTagT1;
    parentEdge2.modifier = addsTagT2;

    const expression = new EdgeExpression(edge);
    expression.expandParent(new EdgeExpression(parentEdge1));
    expression.expandParent(new EdgeExpression(parentEdge2));

    assert.hasAllDeepKeys(expression.unresolvedFlows, grandparentEdge);
    assert.deepEqual(expression.unresolvedFlows.get(grandparentEdge), new FlowModifierSet(addsTagT1, addsTagT2));
  });

  it('applies child modifier after parent modifier', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
    parentEdge.modifier = addsTagsT1AndT2;
    edge.modifier = removesTagT1;

    const expression = new EdgeExpression(edge);
    expression.expandParent(new EdgeExpression(parentEdge));

    assert.isTrue(expression.isResolved);
    assert.deepEqual(expression.resolvedFlows, new FlowSet(addsTagT2.toFlow()));
  });
});

describe('Solver', () => {
  it('starts with empty edge expressions and dependencies', () => {
    const edges = createChainOfEdges('A', 'B', 'C');
    const solver = new Solver(edges);

    assert.isFalse(solver.isResolved);
    assert.isEmpty(solver.edgeExpressions);
    assert.hasAllDeepKeys(solver.dependentExpressions, edges);
    for (const dependencies of solver.dependentExpressions.values()) {
      assert.isEmpty(dependencies);
    }
  });

  describe('processEdge', () => {
    it('adds edge expression and dependency', () => {
      const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
      const solver = new Solver([parentEdge, edge]);

      const expression = solver.processEdge(edge);

      assert.strictEqual(solver.edgeExpressions.get(edge), expression);
      assert.hasAllKeys(solver.edgeExpressions, [edge]);
      assert.strictEqual(expression.edge, edge);
      assert.sameMembers(expression.parents, [parentEdge]);
      assert.isEmpty(solver.dependentExpressions.get(edge));
      const parentDeps = solver.dependentExpressions.get(parentEdge);
      assert.hasAllKeys(parentDeps, [expression]);
    });

    it('expands known resolved parent', () => {
      const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
      parentEdge.modifier = addsTagT1;
      edge.modifier = addsTagT2;
      const solver = new Solver([parentEdge, edge]);
      
      const parentExpression = solver.processEdge(parentEdge);
      assert.isTrue(parentExpression.isResolved);
      assert.deepEqual(parentExpression.resolvedFlows, new FlowSet(addsTagT1.toFlow()));
      
      const expression = solver.processEdge(edge);
      assert.isTrue(expression.isResolved);
      assert.deepEqual(expression.resolvedFlows, new FlowSet(addsTagsT1AndT2.toFlow()));
      assert.isEmpty(solver.dependentExpressions.get(parentEdge));
    });

    it('expands known unresolved parent', () => {
      const [grandparentEdge, parentEdge, edge] = createChainOfEdges('A', 'B', 'C', 'D');
      const solver = new Solver([grandparentEdge, parentEdge, edge]);
      
      const parentExpression = solver.processEdge(parentEdge);
      const expression = solver.processEdge(edge);

      assert.sameMembers(expression.parents, [grandparentEdge]);
      assert.isEmpty(solver.dependentExpressions.get(parentEdge));
      assert.hasAllKeys(solver.dependentExpressions.get(grandparentEdge), [parentExpression, expression]);
    });

    it('expands the current edge into its dependent edges', () => {
      const [edge, childEdge] = createChainOfEdges('A', 'B', 'C');
      edge.modifier = addsTagT1;
      childEdge.modifier = addsTagT2;
      const solver = new Solver([edge, childEdge]);

      const childExpression = solver.processEdge(childEdge);
      assert.isFalse(childExpression.isResolved);
      assert.hasAllKeys(solver.dependentExpressions.get(edge), [childExpression]);
      
      const expression = solver.processEdge(edge);
      assert.isEmpty(solver.dependentExpressions.get(edge));
      assert.isTrue(expression.isResolved);
      assert.isTrue(childExpression.isResolved);
    });
  });

  describe('resolve', () => {
    it('fully resolves all edges', () => {
      const edges = createChainOfEdges('A', 'B', 'C', 'D');
      const solver = new Solver(edges);
      
      solver.resolve();

      assert.isTrue(solver.isResolved);
      for (const expression of solver.edgeExpressions.values()) {
        assert.isTrue(expression.isResolved);
      }
    });
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
    assert.isTrue(validateGraph(graph).isValid);
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
    assert.isTrue(validateGraph(graph).isValid);
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
    assertFailures(validateGraph(graph), [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
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
    assertFailures(validateGraph(graph), [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  });

  it('fails when a "not tag" is claimed and the tag is checked for', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is not trusted
      particle P2
        in Foo {} bar
        check bar is trusted
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    assertFailures(validateGraph(graph), [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  });

  it('succeeds when a "not tag" is claimed and there are no checks', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is not trusted
      particle P2
        in Foo {} bar
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    assert.isTrue(validateGraph(graph).isValid);
  });

  it('fails when a "not tag" cancels a tag', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        in Foo {} bar
        out Foo {} baz
        claim baz is not trusted
      particle P3
        in Foo {} bye
        check bye is trusted
      recipe R
        P1
          foo -> h
        P2
          bar <- h
          baz -> h1
        P3
          bye <- h1
    `);
    assert.isFalse(validateGraph(graph).isValid);
  });

  it('succeeds when a "not tag" cancels a tag that is reclaimed downstream', async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is trusted
      particle P2
        in Foo {} bar
        out Foo {} baz
        claim baz is not trusted
      particle P3
        in Foo {} bye
        out Foo {} boy
        claim boy is trusted
      particle P4
        in Foo {} bit
        check bit is trusted
      recipe R
        P1
          foo -> h
        P2
          bar <- h
          baz -> h1
        P3
          bye <- h1
          boy -> h2
        P4
          bit <- h2
    `);
    assert.isTrue(validateGraph(graph).isValid);
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
    assert.isTrue(validateGraph(graph).isValid);
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
    assertFailures(validateGraph(graph), [`'check bar is trusted' failed for path: P2.foo -> P3.bar`]);
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
    assertFailures(validateGraph(graph), [`'check bar is trusted' failed for path: P.bar`]);
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
    assert.isTrue(validateGraph(graph).isValid);
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
    const result = validateGraph(graph);
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
    const result = validateGraph(graph);
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
    assertFailures(validateGraph(graph), [`'check bar is tag1 or is tag2' failed for path: P2.foo -> P3.bar`]);
  });

  it(`succeeds when a check including multiple anded tags is met by a single claim`, async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is tag1 and is tag2
      particle P2
        in Foo {} bar
        check bar is tag1 and is tag2
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const result = validateGraph(graph);
    assert.isTrue(result.isValid);
  });

  it(`succeeds when a check including multiple ored tags is met by a single claim`, async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is tag1 and is tag2
      particle P2
        in Foo {} bar
        check bar is tag1 or is tag2
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    const result = validateGraph(graph);
    assert.isTrue(result.isValid);
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
    assertFailures(validateGraph(graph), [
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
    assertFailures(validateGraph(graph), [
      `'check bar1 is trusted' failed for path: P1.foo1 -> P2.bar1`,
      `'check bar2 is extraTrusted' failed for path: P1.foo2 -> P2.bar2`,
    ]);
  });

  it('supports datastore tag claims', async () => {
    const graph = await buildFlowGraph(`
      schema MyEntity
        Text text
      resource MyResource
        start
        [{"text": "asdf"}]
      store MyStore of MyEntity in MyResource
        claim is trusted
      particle P
        in MyEntity input
        check input is trusted
      recipe R
        use MyStore as s
        P
          input <- s
    `);
    assert.isTrue(validateGraph(graph).isValid);
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
      assert.isTrue(validateGraph(graph).isValid);
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
      assertFailures(validateGraph(graph), [`'check input2 is from handle input1' failed for path: P.input2`]);
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
      assert.isTrue(validateGraph(graph).isValid);
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
      assert.isTrue(validateGraph(graph).isValid);
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
      assert.isTrue(validateGraph(graph).isValid);
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
      assertFailures(validateGraph(graph), [
        `'check inputToCheck is from handle trustedSource' failed for path: P1.input2 -> P1.output -> P2.inputToCheck`,
      ]);
    });
  });

  describe(`'is from store' check conditions`, () => {
    it('succeeds when the data store identified by name is present', async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity in MyResource
        particle P
          in MyEntity input
          check input is from store MyStore
        recipe R
          use MyStore as s
          P
            input <- s
      `);
      assert.isTrue(validateGraph(graph).isValid);
    });

    it('succeeds when the data store identified by ID is present', async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        particle P
          in MyEntity input
          check input is from store 'my-store-id'
        recipe R
          use MyStore as s
          P
            input <- s
      `);
      assert.isTrue(validateGraph(graph).isValid);
    });

    it('fails when the data store identified by name is missing', async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        particle P
          in Foo {} input
          check input is from store MyStore
        recipe R
          P
            input <- h
      `), 'Store with name MyStore not found.');
    });

    it('fails when the data store identified by ID is missing', async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        particle P
          in Foo {} input
          check input is from store 'my-store-id'
        recipe R
          P
            input <- h
      `), `Store with id 'my-store-id' not found.`);
    });


    it('fails when the data store is not connected', async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        store SomeOtherStore of MyEntity in MyResource
        particle P
          in MyEntity input
          check input is from store 'my-store-id'
        recipe R
          use SomeOtherStore as s
          P
            input <- s
      `), 'Store with id my-store-id is not connected by a handle.');
    });

    it('fails when the wrong data store is present', async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity in MyResource
        store SomeOtherStore of MyEntity in MyResource
        particle P
          in MyEntity input1
          in MyEntity input2
          check input1 is from store MyStore
        recipe R
          use SomeOtherStore as s1
          use MyStore as s2
          P
            input1 <- s1
            input2 <- s2
      `);
      assertFailures(validateGraph(graph), [`'check input1 is from store MyStore' failed for path: P.input`]);
    });
  });

  describe(`checks using the 'or' operator`, () => {
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
      assert.isTrue(validateGraph(graph).isValid);
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
      assert.isTrue(validateGraph(graph).isValid);
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
      assertFailures(validateGraph(graph), [
        `'check inputToCheck is from handle trustedSource or is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    });
  });

  describe(`checks using the 'and' operator`, () => {
    it('succeeds when both conditions are met', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
          claim output is trusted
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource and is trusted
        recipe R
          P1
            output -> h
          P2
            trustedSource <- h
            inputToCheck <- h
      `);
      assert.isTrue(validateGraph(graph).isValid);
    });

    it('fails when only one condition is met', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
          claim output is onlyKindaTrusted
        particle P2
          in Foo {} trustedSource
          in Foo {} inputToCheck
          check inputToCheck is from handle trustedSource and is trusted
        recipe R
          P1
            output -> h
          P2
            trustedSource <- h
            inputToCheck <- h
      `);
      assertFailures(validateGraph(graph), [
        `'check inputToCheck is from handle trustedSource and is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    });

    it(`handles nesting of boolean conditions`, async () => {
      const validateCondition = async (checkCondition: string) => {
        const graph = await buildFlowGraph(`
          particle P1
            out Foo {} output
            claim output is trusted
          particle P2
            in Foo {} trustedSource
            in Foo {} inputToCheck
            check inputToCheck ${checkCondition}
          recipe R
            P1
              output -> h
            P2
              trustedSource <- h
              inputToCheck <- h
        `);
        return validateGraph(graph).isValid;
      };

      assert.isTrue(await validateCondition('is trusted'));
      assert.isTrue(await validateCondition('is from handle trustedSource'));
      assert.isTrue(await validateCondition('is from handle trustedSource and is trusted'));
      assert.isTrue(await validateCondition('is from handle trustedSource or is trusted'));
      assert.isTrue(await validateCondition('is from handle trustedSource or is somethingElse'));
      assert.isTrue(await validateCondition('is trusted or is somethingElse'));
      assert.isTrue(await validateCondition('is trusted or (is somethingElse or is someOtherThing)'));
      assert.isTrue(await validateCondition('(is trusted or is somethingElse) and (is trusted or is someOtherThing)'));

      assert.isFalse(await validateCondition('is from handle trustedSource and is somethingElse'));
      assert.isFalse(await validateCondition('is trusted and is somethingElse'));
      assert.isFalse(await validateCondition('is trusted and (is somethingElse or is someOtherThing)'));
      assert.isFalse(await validateCondition('(is trusted and is somethingElse) or (is trusted and is someOtherThing)'));
    });
  });

  describe('checks on slots', () => {
    it('succeeds for tag checks when the slot consumer has the right tag', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          consume root
            provide slotToProvide
          check slotToProvide data is trusted
        particle P2
          out Foo {} foo
          claim foo is trusted
        particle P3
          in Foo {} bar
          consume slotToConsume
        recipe R
          slot 'rootslotid-root' as root
          P1
            consume root as root
              provide slotToProvide as slot0
          P2
            foo -> h
          P3
            bar <- h
            consume slotToConsume as slot0
      `);
      assert.isTrue(validateGraph(graph).isValid);
    });

    it('fails for tag checks when the tag is missing', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          consume root
            provide slotToProvide
          check slotToProvide data is trusted
        particle P2
          consume slotToConsume
        recipe R
          slot 'rootslotid-root' as root
          P1
            consume root as root
              provide slotToProvide as slot0
          P2
            consume slotToConsume as slot0
      `);
      assertFailures(validateGraph(graph), [`'check slotToProvide data is trusted' failed for path: P2.slotToConsume`]);
    });

    it('succeeds for handle checks when the slot consumer derives from the right handle', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} foo
          consume root
            provide slotToProvide
          check slotToProvide data is from handle foo
        particle P2
          in Foo {} bar
          consume slotToConsume
        recipe R
          slot 'rootslotid-root' as root
          P1
            foo -> h
            consume root as root
              provide slotToProvide as slot0
          P2
            bar <- h
            consume slotToConsume as slot0
      `);
      assert.isTrue(validateGraph(graph).isValid);
    });

    it('fails for handle checks when the handle is not present', async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} foo
          consume root
            provide slotToProvide
          check slotToProvide data is from handle foo
        particle P2
          consume slotToConsume
        recipe R
          slot 'rootslotid-root' as root
          P1
            foo -> h
            consume root as root
              provide slotToProvide as slot0
          P2
            consume slotToConsume as slot0
      `);
      assertFailures(validateGraph(graph), [`'check slotToProvide data is from handle foo' failed for path: P2.slotToConsume`]);
    });
  });
});
