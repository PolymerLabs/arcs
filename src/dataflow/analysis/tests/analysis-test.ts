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
import {validateGraph, Solver, EdgeExpression} from '../analysis.js';
import {buildFlowGraph, TestEdge, TestNode} from '../testing/flow-graph-testing.js';
import {assertThrowsAsync} from '../../../runtime/testing/test-util.js';
import {FlowSet, Flow, FlowModifier, TagOperation, FlowModifierSet} from '../graph-internals.js';
import {FlowGraph} from '../flow-graph.js';
import {Flags} from '../../../runtime/flags.js';

/** Checks that the given ValidationResult failed with the expected failure messages. */
function assertGraphFailures(graph: FlowGraph, expectedFailures: string[]) {
  const result = validateGraph(graph);
  assert.isFalse(result.isValid);
  assert.sameMembers(result.getFailureMessages(graph), expectedFailures);
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

  // Mark the first node in the chain as having ingress, so the whole chain is
  // valid.
  nodes[0].ingress = true;

  return edges;
}

/**
 * Marks the nodes representing the given particles as having ingress.
 *
 * This is a convenient hack for constructing unit tests with the desired
 * properties. Normally only handles with the use, map or copy fates are
 * considered ingress nodes, but they're a bit too inconvenient to use in most
 * test cases, so this method can be used to manually mark particles as ingress
 * nodes.
 */
function markParticlesWithIngress(graph: FlowGraph, ...particleNames: string[]) {
  for (const name of particleNames) {
    const node = graph.particleMap.get(name);
    assert.isDefined(node, `Particle with name '${name}' not found`);
    node.ingress = true;
  }
}

/**
 * Same as markParticlesWithIngress, but operates on handles instead of
 * particles. The handles with the given labels (of the form
 * "ParticleName.inputName") will be marked with ingress.
 */
function markParticleInputsWithIngress(graph: FlowGraph, ...labels: string[]) {
  for (const label of labels) {
    const parts = label.split('.');
    assert.lengthOf(parts, 2, `Particle input '${label}' is not of the form 'ParticleName.inputName'`);
    const [particleName, inputName] = parts;
    const particleNode = graph.particleMap.get(particleName);
    assert.isDefined(particleNode, `Particle with name '${particleName}' not found.`);
    const inputEdge = particleNode.inEdgesByName.get(inputName);
    assert.isDefined(inputEdge, `Particle '${particleName}' does not have input '${inputName}'`);
    inputEdge.start.ingress = true;
  }
}

/** Creates a new FlowModifier that adds the given tags. */
function addsTag(...tags: string[]): FlowModifier {
  const modifier = new FlowModifier();
  for (const tag of tags) {
    modifier.tagOperations.set(tag, TagOperation.Add);
  }
  return modifier;
}

// FlowModifier constants.
const addsTagT1 = addsTag('t1');
const addsTagT2 = addsTag('t2');
const addsTagsT1AndT2 = addsTag('t1', 't2');

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
    assert.isTrue(expression.resolvedFlows.equals(expectedFlowSet));

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
    assert.isTrue(expression.resolvedFlows.equals(new FlowSet(flow)));

    assert.equal(expression.toString(), `EdgeExpression(A->B) {
  {tag:t1}
}`);
  });

  it('can construct an edge with parent and a modifier', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');

    edge.modifier = addsTagT1;
    const expression = new EdgeExpression(edge);

    assert.isFalse(expression.isResolved);
    assert.isTrue(expression.resolvedFlows.isEmpty);
    assert.hasAllKeys(expression.unresolvedFlows, [parentEdge]);
    assert.isTrue(expression.unresolvedFlows.get(parentEdge).equals(new FlowModifierSet(addsTagT1)));
    assert.sameMembers(expression.parents, [parentEdge]);

    assert.equal(expression.toString(), `EdgeExpression(B->C) {
  EdgeExpression(A->B) + {+tag:t1}
}`);
  });

  it('start nodes with no parents and no ingress produce no flow', () => {
    const [edge] = createChainOfEdges('A', 'B');
    edge.start.ingress = false;

    const expression = new EdgeExpression(edge);

    assert.isTrue(expression.isResolved);
    assert.isTrue(expression.resolvedFlows.isEmpty);
    assert.isEmpty(expression.unresolvedFlows);

    assert.equal(expression.toString(), `EdgeExpression(A->B) {
}`);
  });

  it('nodes with parents and with ingress have both resolved and unresolved flow', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
    edge.start.ingress = true;

    const expression = new EdgeExpression(edge);

    assert.isFalse(expression.isResolved);
    assert.isTrue(expression.resolvedFlows.equals(new FlowSet(new Flow())));
    assert.hasAllKeys(expression.unresolvedFlows, [parentEdge]);

    assert.equal(expression.toString(), `EdgeExpression(B->C) {
  {}
  EdgeExpression(A->B) + {}
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
    assert.isTrue(expression.resolvedFlows.equals(new FlowSet(addsTagsT1AndT2.toFlow())));
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
    assert.isTrue(expression.unresolvedFlows.get(grandparentEdge).equals(new FlowModifierSet(addsTagsT1AndT2)));
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
    assert.isTrue(expression.resolvedFlows.equals(new FlowSet(addsTagT1.toFlow(), addsTagT2.toFlow())));
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
    assert.isTrue(expression.unresolvedFlows.get(grandparentEdge).equals(new FlowModifierSet(addsTagT1, addsTagT2)));
  });

  it('applies child modifier after parent modifier', () => {
    const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
    parentEdge.modifier = addsTagsT1AndT2;
    edge.modifier = removesTagT1;

    const expression = new EdgeExpression(edge);
    expression.expandParent(new EdgeExpression(parentEdge));

    assert.isTrue(expression.isResolved);
    assert.isTrue(expression.resolvedFlows.equals(new FlowSet(addsTagT2.toFlow())));
  });

  describe('removeSelfReference', () => {
    it('does nothing if there is no self-reference', () => {
      const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
      const expression = new EdgeExpression(edge);

      expression.removeSelfReference();

      assert.hasAllKeys(expression.unresolvedFlows, [parentEdge]);
    });

    it('combines self-modifiers with parent modifiers pair-wise', () => {
      const [parentEdge, edge] = createChainOfEdges('A', 'B', 'C');
      const expression = new EdgeExpression(edge);
      // Set two different modifiers on the parent flow: 'parent1' and 'parent2'.
      const parentModifiers = new FlowModifierSet(addsTag('parent1'), addsTag('parent2'));
      expression.unresolvedFlows.set(parentEdge, parentModifiers);
      // Set two different self-modifiers: 'self1' and 'self2'.
      const selfModifiers = new FlowModifierSet(addsTag('self1'), addsTag('self2'));
      expression.unresolvedFlows.set(edge, selfModifiers);

      expression.removeSelfReference();

      assert.hasAllKeys(expression.unresolvedFlows, [parentEdge]);
      assert.isTrue(expression.unresolvedFlows.get(parentEdge).equals(
        new FlowModifierSet(
          addsTag('parent1'),
          addsTag('parent1', 'self1'),
          addsTag('parent1', 'self2'),
          addsTag('parent2'),
          addsTag('parent2', 'self1'),
          addsTag('parent2', 'self2'))));
    });

    it('combines self-modifiers with resolved flows pair-wise', () => {
      const [edge] = createChainOfEdges('A', 'B');
      edge.start.ingress = false;
      const expression = new EdgeExpression(edge);
      // Adds two different resolved flows: 'resolved1' and 'resolved2'.
      expression.resolvedFlows.add(addsTag('resolved1').toFlow());
      expression.resolvedFlows.add(addsTag('resolved2').toFlow());
      // Set two different self-modifiers: 'self1' and 'self2'.
      const selfModifiers = new FlowModifierSet(addsTag('self1'), addsTag('self2'));
      expression.unresolvedFlows.set(edge, selfModifiers);

      expression.removeSelfReference();

      assert.isEmpty(expression.unresolvedFlows);
      assert.isTrue(expression.resolvedFlows.equals(
        new FlowSet(
          addsTag('resolved1').toFlow(),
          addsTag('resolved1', 'self1').toFlow(),
          addsTag('resolved1', 'self2').toFlow(),
          addsTag('resolved2').toFlow(),
          addsTag('resolved2', 'self1').toFlow(),
          addsTag('resolved2', 'self2').toFlow())));
    });
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
      assert.isTrue(parentExpression.resolvedFlows.equals(new FlowSet(addsTagT1.toFlow())));

      const expression = solver.processEdge(edge);
      assert.isTrue(expression.isResolved);
      assert.isTrue(expression.resolvedFlows.equals(new FlowSet(addsTagsT1AndT2.toFlow())));
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
  it('SLANDLES SYNTAX succeeds when there are no checks', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        foo: out Foo {}
        claim foo is trusted
      recipe R
        P
          foo: out h
    `);
    markParticlesWithIngress(graph, 'P');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds when there are no checks', Flags.withPreSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        out Foo {} foo
        claim foo is trusted
      recipe R
        P
          foo -> h
    `);
    markParticlesWithIngress(graph, 'P');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX succeeds when a check is satisfied directly', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds when a check is satisfied directly', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX fails when the edge has no ingress', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    assertGraphFailures(graph, [`'check bar is trusted' failed: no data ingress.`]);
  }));

  it('fails when the edge has no ingress', Flags.withPreSlandlesSyntax(async () => {
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
    assertGraphFailures(graph, [`'check bar is trusted' failed: no data ingress.`]);
  }));

  it('SLANDLES SYNTAX fails when the edge has no ingress', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    assertGraphFailures(graph, [`'check bar is trusted' failed: no data ingress.`]);
  }));

  it('fails when the edge has no ingress', Flags.withPreSlandlesSyntax(async () => {
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
    assertGraphFailures(graph, [`'check bar is trusted' failed: no data ingress.`]);
  }));

  it('SLANDLES SYNTAX fails when a different tag is claimed', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is notTrusted
      particle P2
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  }));

  it('fails when a different tag is claimed', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  }));

  it('SLANDLES SYNTAX fails when no tag is claimed', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
      particle P2
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  }));

  it('fails when no tag is claimed', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  }));

  it('SLANDLES SYNTAX fails when a "not tag" is claimed and the tag is checked for', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is not trusted
      particle P2
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  }));

  it('fails when a "not tag" is claimed and the tag is checked for', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P1.foo -> P2.bar`]);
  }));

  it('SLANDLES SYNTAX succeeds when a "not tag" is claimed and there are no checks', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is not trusted
      particle P2
        bar: in Foo {}
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));
  it('succeeds when a "not tag" is claimed and there are no checks', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX fails when a "not tag" cancels a tag', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        baz: out Foo {}
        claim baz is not trusted
      particle P3
        bye: in Foo {}
        check bye is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
          baz: out h1
        P3
          bye: in h1
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isFalse(validateGraph(graph).isValid);
  }));

  it('fails when a "not tag" cancels a tag', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isFalse(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX succeeds when a "not tag" cancels a tag that is reclaimed downstream', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        baz: out Foo {}
        claim baz is not trusted
      particle P3
        bye: in Foo {}
        boy: out Foo {}
        claim boy is trusted
      particle P4
        bit: in Foo {}
        check bit is trusted
      recipe R
        P1
          foo: out h
        P2
          bar: in h
          baz: out h1
        P3
          bye: in h1
          boy: out h2
        P4
          bit: in h2
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds when a "not tag" cancels a tag that is reclaimed downstream', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX succeeds for a negated tag check when the tag is missing', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        bar: in Foo {}
        check bar is not private
      recipe R
        P
          bar: in h
    `);
    markParticleInputsWithIngress(graph, 'P.bar');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds for a negated tag check when the tag is missing', Flags.withPreSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        in Foo {} bar
        check bar is not private
      recipe R
        P
          bar <- h
    `);
    markParticleInputsWithIngress(graph, 'P.bar');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX fails for a negated tag check when the tag is present', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is private
      particle P2
        bar: in Foo {}
        check bar is not private
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is not private' failed for path: P1.foo -> P2.bar`]);
  }));

  it('fails for a negated tag check when the tag is present', Flags.withPreSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        out Foo {} foo
        claim foo is private
      particle P2
        in Foo {} bar
        check bar is not private
      recipe R
        P1
          foo -> h
        P2
          bar <- h
    `);
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [`'check bar is not private' failed for path: P1.foo -> P2.bar`]);
  }));

  it('SLANDLES SYNTAX succeeds when an inout handle claims the same tag it checks', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        foo: inout Foo {}
        check foo is t
        claim foo is t
      recipe R
        P
          foo: inout h
    `);
    markParticlesWithIngress(graph, 'P');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds when an inout handle claims the same tag it checks', Flags.withPreSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        inout Foo {} foo
        check foo is t
        claim foo is t
      recipe R
        P
          foo <-> h
    `);
    markParticlesWithIngress(graph, 'P');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX fails when an inout handle claims a different tag from the one it checks', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        foo: inout Foo {}
        check foo is t1
        claim foo is t2
      recipe R
        P
          foo: inout h
    `);
    markParticlesWithIngress(graph, 'P');
    assertGraphFailures(graph, [`'check foo is t1' failed for path: P.foo -> P.foo`]);
  }));

  it('fails when an inout handle claims a different tag from the one it checks', Flags.withPreSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        inout Foo {} foo
        check foo is t1
        claim foo is t2
      recipe R
        P
          foo <-> h
    `);
    markParticlesWithIngress(graph, 'P');
    assertGraphFailures(graph, [`'check foo is t1' failed for path: P.foo -> P.foo`]);
  }));

  it('SLANDLES SYNTAX succeeds when handle has multiple inputs with the right tags', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        foo: out Foo {}
        claim foo is trusted
      particle P3
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          foo: out h
        P3
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1', 'P2');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds when handle has multiple inputs with the right tags', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1', 'P2');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX fails when handle has multiple inputs but one is untagged', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        foo: out Foo {}
      particle P3
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          foo: out h
        P3
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1', 'P2');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P2.foo -> P3.bar`]);
  }));

  it('fails when handle has multiple inputs but one is untagged', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1', 'P2');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P2.foo -> P3.bar`]);
  }));

  it('SLANDLES SYNTAX fails when handle has no inputs', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        bar: in Foo {}
        check bar is trusted
      recipe R
        P
          bar: in h
    `);
    markParticleInputsWithIngress(graph, 'P.bar');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P.bar`]);
  }));
  it('fails when handle has no inputs', Flags.withPreSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P
        in Foo {} bar
        check bar is trusted
      recipe R
        P
          bar <- h
    `);
    markParticleInputsWithIngress(graph, 'P.bar');
    assertGraphFailures(graph, [`'check bar is trusted' failed for path: P.bar`]);
  }));

  it('SLANDLES SYNTAX claim propagates through a chain of particles', Flags.withPostSlandlesSyntax( async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        foo: out Foo {}
      particle P3
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h1
        P2
          bar: in h1
          foo: out h2
        P3
          bar: in h2
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('claim propagates through a chain of particles', Flags.withPreSlandlesSyntax( async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX a claim made later in a chain of particles does not override claims made earlier', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is trusted
      particle P2
        bar: in Foo {}
        foo: out Foo {}
        claim foo is someOtherTag
      particle P3
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h1
        P2
          bar: in h1
          foo: out h2
        P3
          bar: in h2
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('a claim made later in a chain of particles does not override claims made earlier', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX succeeds when a check includes multiple tags', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is tag1
      particle P2
        foo: out Foo {}
        claim foo is tag2
      particle P3
        bar: in Foo {}
        check bar is tag1 or is tag2
      recipe R
        P1
          foo: out h
        P2
          foo: out h
        P3
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1', 'P2');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('succeeds when a check includes multiple tags', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1', 'P2');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it(`SLANDLES SYNTAX fails when a check including multiple tags isn't met`, Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is tag1
      particle P2
        foo: out Foo {}
        claim foo is someOtherTag
      particle P3
        bar: in Foo {}
        check bar is tag1 or is tag2
      recipe R
        P1
          foo: out h
        P2
          foo: out h
        P3
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1', 'P2');
    assertGraphFailures(graph, [`'check bar is tag1 or is tag2' failed for path: P2.foo -> P3.bar`]);
  }));

  it(`fails when a check including multiple tags isn't met`, Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1', 'P2');
    assertGraphFailures(graph, [`'check bar is tag1 or is tag2' failed for path: P2.foo -> P3.bar`]);
  }));

  it(`SLANDLES SYNTAX succeeds when a check including multiple anded tags is met by a single claim`, Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is tag1 and is tag2
      particle P2
        bar: in Foo {}
        check bar is tag1 and is tag2
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it(`succeeds when a check including multiple anded tags is met by a single claim`, Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it(`SLANDLES SYNTAX succeeds when a check including multiple 'or'd tags is met by a single claim`, Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is tag1 and is tag2
      particle P2
        bar: in Foo {}
        check bar is tag1 or is tag2
      recipe R
        P1
          foo: out h
        P2
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it(`succeeds when a check including multiple 'or'd tags is met by a single claim`, Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('SLANDLES SYNTAX can detect more than one failure for the same check', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo: out Foo {}
        claim foo is notTrusted
      particle P2
        foo: out Foo {}
        claim foo is someOtherTag
      particle P3
        foo: out Foo {}
      particle P4
        bar: in Foo {}
        check bar is trusted
      recipe R
        P1
          foo: out h
        P2
          foo: out h
        P3
          foo: out h
        P4
          bar: in h
    `);
    markParticlesWithIngress(graph, 'P1', 'P2', 'P3');
    assertGraphFailures(graph, [
      `'check bar is trusted' failed for path: P1.foo -> P4.bar`,
      `'check bar is trusted' failed for path: P2.foo -> P4.bar`,
      `'check bar is trusted' failed for path: P3.foo -> P4.bar`,
    ]);
  }));

  it('can detect more than one failure for the same check', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1', 'P2', 'P3');
    assertGraphFailures(graph, [
      `'check bar is trusted' failed for path: P1.foo -> P4.bar`,
      `'check bar is trusted' failed for path: P2.foo -> P4.bar`,
      `'check bar is trusted' failed for path: P3.foo -> P4.bar`,
    ]);
  }));

  it('SLANDLES SYNTAX can detect failures for different checks', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      particle P1
        foo1: out Foo {}
        foo2: out Foo {}
        claim foo1 is notTrusted
        claim foo2 is trusted
      particle P2
        bar1: in Foo {}
        bar2: in Foo {}
        check bar1 is trusted
        check bar2 is extraTrusted
      recipe R
        P1
          foo1: out h1
          foo2: out h2
        P2
          bar1: in h1
          bar2: in h2
    `);
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [
      `'check bar1 is trusted' failed for path: P1.foo1 -> P2.bar1`,
      `'check bar2 is extraTrusted' failed for path: P1.foo2 -> P2.bar2`,
    ]);
  }));

  it('can detect failures for different checks', Flags.withPreSlandlesSyntax(async () => {
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
    markParticlesWithIngress(graph, 'P1');
    assertGraphFailures(graph, [
      `'check bar1 is trusted' failed for path: P1.foo1 -> P2.bar1`,
      `'check bar2 is extraTrusted' failed for path: P1.foo2 -> P2.bar2`,
    ]);
  }));

  it('SLANDLES SYNTAX supports datastore tag claims', Flags.withPostSlandlesSyntax(async () => {
    const graph = await buildFlowGraph(`
      schema MyEntity
        Text text
      resource MyResource
        start
        [{"text": "asdf"}]
      store MyStore of MyEntity in MyResource
        claim is trusted
      particle P
        input: in MyEntity
        check input is trusted
      recipe R
        s: use MyStore
        P
          input: in s
    `);
    assert.isTrue(validateGraph(graph).isValid);
  }));

  it('supports datastore tag claims', Flags.withPreSlandlesSyntax(async () => {
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
  }));

  describe(`'is from handle' check conditions`, () => {
    it('SLANDLES SYNTAX succeeds when the handle is exactly the same', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input1: in Foo {}
          input2: in Foo {}
          check input2 is from handle input1
        recipe R
          P
            input1: in h
            input2: in h
      `);
      markParticleInputsWithIngress(graph, 'P.input1', 'P.input2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the handle is exactly the same', Flags.withPreSlandlesSyntax(async () => {
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
      markParticleInputsWithIngress(graph, 'P.input1', 'P.input2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails when handle is different', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input1: in Foo {}
          input2: in Foo {}
          check input2 is from handle input1
        recipe R
          P
            input1: in h1
            input2: in h2
      `);
      markParticleInputsWithIngress(graph, 'P.input1', 'P.input2');
      assertGraphFailures(graph, [`'check input2 is from handle input1' failed for path: P.input2`]);
    }));

    it('fails when handle is different', Flags.withPreSlandlesSyntax(async () => {
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
      markParticleInputsWithIngress(graph, 'P.input1', 'P.input2');
      assertGraphFailures(graph, [`'check input2 is from handle input1' failed for path: P.input2`]);
    }));

    it('SLANDLES SYNTAX succeeds for a negated handle check when the handle is different', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input1: in Foo {}
          input2: in Foo {}
          check input2 is not from handle input1
        recipe R
          P
            input1: in h1
            input2: in h2
      `);
      markParticleInputsWithIngress(graph, 'P.input1', 'P.input2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds for a negated handle check when the handle is different', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input1
          in Foo {} input2
          check input2 is not from handle input1
        recipe R
          P
            input1 <- h1
            input2 <- h2
      `);
      markParticleInputsWithIngress(graph, 'P.input1', 'P.input2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails for a negated handle check when the handle is the same', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input1: in Foo {}
          input2: in Foo {}
          check input2 is not from handle input1
        recipe R
          P
            input1: in h
            input2: in h
      `);
      markParticleInputsWithIngress(graph, 'P.input1');
      assertGraphFailures(graph, [`'check input2 is not from handle input1' failed for path: P.input2`]);
    }));

    it('fails for a negated handle check when the handle is the same', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input1
          in Foo {} input2
          check input2 is not from handle input1
        recipe R
          P
            input1 <- h
            input2 <- h
      `);
      markParticleInputsWithIngress(graph, 'P.input1');
      assertGraphFailures(graph, [`'check input2 is not from handle input1' failed for path: P.input2`]);
    }));

    it('SLANDLES SYNTAX succeeds on an inout handle checking against itself', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          foo: inout Foo {}
          check foo is from handle foo
        recipe R
          P
            foo: inout h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds on an inout handle checking against itself', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          inout Foo {} foo
          check foo is from handle foo
        recipe R
          P
            foo <-> h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX succeeds when the handle has inputs', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          output1: out Foo {}
          output2: out Foo {}
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            output1: out h
            output2: out h
          P2
            trustedSource: in h
            inputToCheck: in h
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the handle has inputs', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX succeeds when the handle is separated by a chain of other particles', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          input: in Foo {}
          output: out Foo {}
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            input: in h
            output: out h1
          P2
            trustedSource: in h
            inputToCheck: in h1
      `);
      markParticleInputsWithIngress(graph, 'P1.input');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the handle is separated by a chain of other particles', Flags.withPreSlandlesSyntax(async () => {
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
      markParticleInputsWithIngress(graph, 'P1.input');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX succeeds when the handle is separated by another particle with a claim', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          input: in Foo {}
          output: out Foo {}
          claim output is somethingElse
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            input: in h
            output: out h1
          P2
            trustedSource: in h
            inputToCheck: in h1
      `);
      markParticleInputsWithIngress(graph, 'P1.input');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the handle is separated by another particle with a claim', Flags.withPreSlandlesSyntax(async () => {
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
      markParticleInputsWithIngress(graph, 'P1.input');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails when another handle is also found', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          input1: in Foo {}
          input2: in Foo {}
          output: out Foo {}
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource
        recipe R
          P1
            input1: in h
            input2: in h1
            output: out h2
          P2
            trustedSource: in h
            inputToCheck: in h2
      `);
      markParticleInputsWithIngress(graph, 'P1.input1', 'P1.input2');
      assertGraphFailures(graph, [
        `'check inputToCheck is from handle trustedSource' failed for path: P1.input2 -> P1.output -> P2.inputToCheck`,
      ]);
    }));

    it('fails when another handle is also found', Flags.withPreSlandlesSyntax(async () => {
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
      markParticleInputsWithIngress(graph, 'P1.input1', 'P1.input2');
      assertGraphFailures(graph, [
        `'check inputToCheck is from handle trustedSource' failed for path: P1.input2 -> P1.output -> P2.inputToCheck`,
      ]);
    }));
  });

  describe(`'is from output' check conditions`, () => {
    it('SLANDLES SYNTAX succeeds when the output is directly connected to the input', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          foo: in Foo {}
          bar: out Foo {}
          check foo is from output bar
        recipe R
          P
            foo: in h
            bar: out h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the output is directly connected to the input', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} foo
          out Foo {} bar
          check foo is from output bar
        recipe R
          P
            foo <- h
            bar -> h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails when the output is directly connected to an ingress input', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          foo: in Foo {}
          bar: out Foo {}
          check foo is from output bar
        recipe R
          P
            foo: in h
            bar: out h
      `);
      markParticleInputsWithIngress(graph, 'P.foo');
      assertGraphFailures(graph, [`'check foo is from output bar' failed for path: P.foo`]);
    }));

    it('fails when the output is directly connected to an ingress input', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} foo
          out Foo {} bar
          check foo is from output bar
        recipe R
          P
            foo <- h
            bar -> h
      `);
      markParticleInputsWithIngress(graph, 'P.foo');
      assertGraphFailures(graph, [`'check foo is from output bar' failed for path: P.foo`]);
    }));

    it('SLANDLES SYNTAX succeeds when the output is separated from the input by another particle', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
      particle P1
        foo: in Foo {}
        bar: out Foo {}
        check foo is from output bar
      particle P2
        foo: in Foo {}
        bar: out Foo {}
      recipe R
        P1
          foo: in h2
          bar: out h1
        P2
          foo: in h1
          bar: out h2
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the output is separated from the input by another particle', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
      particle P1
        in Foo {} foo
        out Foo {} bar
        check foo is from output bar
      particle P2
        in Foo {} foo
        out Foo {} bar
      recipe R
        P1
          foo <- h2
          bar -> h1
        P2
          foo <- h1
          bar -> h2
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails when another particle writes to the same handle', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
      particle P1
        foo: in Foo {}
        bar: out Foo {}
        check foo is from output bar
      particle P2
        bar: out Foo {}
      recipe R
        P1
          foo: in h
          bar: out h
        P2
          bar: out h
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('fails when another particle writes to the same handle', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
      particle P1
        in Foo {} foo
        out Foo {} bar
        check foo is from output bar
      particle P2
        out Foo {} bar
      recipe R
        P1
          foo <- h
          bar -> h
        P2
          bar -> h
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));
  });

  describe(`'is from store' check conditions`, () => {
    it('SLANDLES SYNTAX succeeds when the data store identified by name is present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity in MyResource
        particle P
          input: in MyEntity
          check input is from store MyStore
        recipe R
          s: use MyStore
          P
            input: in s
      `);
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('succeeds when the data store identified by name is present', Flags.withPreSlandlesSyntax(async () => {
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
    }));

    it('SLANDLES SYNTAX succeeds when the data store identified by ID is present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        particle P
          input: in MyEntity
          check input is from store 'my-store-id'
        recipe R
          s: use MyStore
          P
            input: in s
      `);
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when the data store identified by ID is present', Flags.withPreSlandlesSyntax(async () => {
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
    }));

    it('SLANDLES SYNTAX succeeds for a negated store check when the store is different', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        particle P
          input: in MyEntity
          check input is not from store 'my-store-id'
        recipe R
          s: use MyStore
          P
            input: in h
      `);
      markParticleInputsWithIngress(graph, 'P.input');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds for a negated store check when the store is different', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        particle P
          in MyEntity input
          check input is not from store 'my-store-id'
        recipe R
          use MyStore as s
          P
            input <- h
      `);
      markParticleInputsWithIngress(graph, 'P.input');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails for a negated store check when the store is the same', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        particle P
          input: in MyEntity
          check input is not from store 'my-store-id'
        recipe R
          s: use MyStore
          P
            input: in s
      `);
      assertGraphFailures(graph, [`'check input is not from store 'my-store-id'' failed for path: P.input`]);
    }));

    it('fails for a negated store check when the store is the same', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        particle P
          in MyEntity input
          check input is not from store 'my-store-id'
        recipe R
          use MyStore as s
          P
            input <- s
      `);
      assertGraphFailures(graph, [`'check input is not from store 'my-store-id'' failed for path: P.input`]);
    }));

    it('SLANDLES SYNTAX fails when the data store identified by name is missing', Flags.withPostSlandlesSyntax(async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        particle P
          input: in Foo {}
          check input is from store MyStore
        recipe R
          P
            input: in h
      `), 'Store with name MyStore not found.');
    }));

    it('fails when the data store identified by name is missing', Flags.withPreSlandlesSyntax(async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        particle P
          in Foo {} input
          check input is from store MyStore
        recipe R
          P
            input <- h
      `), 'Store with name MyStore not found.');
    }));

    it('SLANDLES SYNTAX fails when the data store identified by ID is missing', Flags.withPostSlandlesSyntax(async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        particle P
          input: in Foo {}
          check input is from store 'my-store-id'
        recipe R
          P
            input: in h
      `), `Store with id 'my-store-id' not found.`);
    }));

    it('fails when the data store identified by ID is missing', Flags.withPreSlandlesSyntax(async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        particle P
          in Foo {} input
          check input is from store 'my-store-id'
        recipe R
          P
            input <- h
      `), `Store with id 'my-store-id' not found.`);
    }));

    it('SLANDLES SYNTAX fails when the data store is not connected', Flags.withPostSlandlesSyntax(async () => {
      assertThrowsAsync(async () => await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity 'my-store-id' in MyResource
        store SomeOtherStore of MyEntity in MyResource
        particle P
          input: in MyEntity
          check input is from store 'my-store-id'
        recipe R
          s: use SomeOtherStore
          P
            input: in s
      `), 'Store with id my-store-id is not connected by a handle.');
    }));

    it('fails when the data store is not connected', Flags.withPreSlandlesSyntax(async () => {
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
    }));

    it('SLANDLES SYNTAX fails when the wrong data store is present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        schema MyEntity
          Text text
        resource MyResource
          start
          [{"text": "asdf"}]
        store MyStore of MyEntity in MyResource
        store SomeOtherStore of MyEntity in MyResource
        particle P
          input1: in MyEntity
          input2: in MyEntity
          check input1 is from store MyStore
        recipe R
          s1: use SomeOtherStore
          s2: use MyStore
          P
            input1: in s1
            input2: in s2
      `);
      assertGraphFailures(graph, [`'check input1 is from store MyStore' failed for path: P.input1`]);
    }));
    it('fails when the wrong data store is present', Flags.withPreSlandlesSyntax(async () => {
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
      assertGraphFailures(graph, [`'check input1 is from store MyStore' failed for path: P.input1`]);
    }));
  });

  describe(`checks using the 'or' operator`, () => {
    it('SLANDLES SYNTAX succeeds when only the handle is present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource or is trusted
        recipe R
          P1
            output: out h
          P2
            trustedSource: in h
            inputToCheck: in h
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when only the handle is present', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX succeeds when only the tag is present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
          claim output is trusted
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource or is trusted
        recipe R
          P1
            output: out h2
          P2
            trustedSource: in h
            inputToCheck: in h2
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds when only the tag is present', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails when neither condition is present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource or is trusted
        recipe R
          P1
            output: out h2
          P2
            trustedSource: in h
            inputToCheck: in h2
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check inputToCheck is from handle trustedSource or is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    }));
    it('fails when neither condition is present', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check inputToCheck is from handle trustedSource or is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    }));
  });

  describe(`checks using the 'and' operator`, () => {
    it('SLANDLES SYNTAX succeeds when both conditions are met', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
          claim output is trusted
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource and is trusted
        recipe R
          P1
            output: out h
          P2
            trustedSource: in h
            inputToCheck: in h
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('succeeds when both conditions are met', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails when only one condition is met', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
          claim output is onlyKindaTrusted
        particle P2
          trustedSource: in Foo {}
          inputToCheck: in Foo {}
          check inputToCheck is from handle trustedSource and is trusted
        recipe R
          P1
            output: out h
          P2
            trustedSource: in h
            inputToCheck: in h
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check inputToCheck is from handle trustedSource and is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    }));
    it('fails when only one condition is met', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check inputToCheck is from handle trustedSource and is trusted' failed for path: P1.output -> P2.inputToCheck`,
      ]);
    }));

    it(`SLANDLES SYNTAX handles nesting of boolean conditions`, Flags.withPostSlandlesSyntax(async () => {
      const validateCondition = async (checkCondition: string) => {
        const graph = await buildFlowGraph(`
          particle P1
            output: out Foo {}
            claim output is trusted
          particle P2
            trustedSource: in Foo {}
            inputToCheck: in Foo {}
            check inputToCheck ${checkCondition}
          recipe R
            P1
              output: out h
            P2
              trustedSource: in h
              inputToCheck: in h
        `);
        markParticlesWithIngress(graph, 'P1');
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
    }));

    it(`handles nesting of boolean conditions`, Flags.withPreSlandlesSyntax(async () => {
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
        markParticlesWithIngress(graph, 'P1');
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
    }));
  });

  describe('checks on slots', () => {
    it('SLANDLES SYNTAX succeeds for tag checks when the slot consumer has the right tag', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          root: consume Slot
            slotToProvide: provide Slot
          check slotToProvide data is trusted
        particle P2
          foo: out Foo {}
          claim foo is trusted
        particle P3
          bar: in Foo {}
          slotToConsume: consume Slot
        recipe R
          root: slot 'rootslotid-root'
          P1
            root: consume root
              slotToProvide: provide slot0
          P2
            foo: out h
          P3
            bar: in h
            slotToConsume: consume slot0
      `);
      markParticlesWithIngress(graph, 'P2');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('succeeds for tag checks when the slot consumer has the right tag', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails for tag checks when the tag is missing', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          root: consume Slot
            slotToProvide: provide Slot
          check slotToProvide data is trusted
        particle P2
          slotToConsume: consume
        recipe R
          root: slot 'rootslotid-root'
          P1
            root: consume root
              slotToProvide: provide slot0
          P2
            slotToConsume: consume slot0
      `);
      markParticlesWithIngress(graph, 'P2');
      assertGraphFailures(graph, [`'check slotToProvide data is trusted' failed for path: P2.slotToConsume`]);
    }));
    it('fails for tag checks when the tag is missing', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P2');
      assertGraphFailures(graph, [`'check slotToProvide data is trusted' failed for path: P2.slotToConsume`]);
    }));

    it('SLANDLES SYNTAX succeeds for handle checks when the slot consumer derives from the right handle', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          foo: out Foo {}
          root: consume Slot
            slotToProvide: provide Slot
          check slotToProvide data is from handle foo
        particle P2
          bar: in Foo {}
          slotToConsume: consume Slot
        recipe R
          root: slot 'rootslotid-root'
          P1
            foo: out h
            root: consume root
              slotToProvide: provide slot0
          P2
            bar: in h
            slotToConsume: consume slot0
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('succeeds for handle checks when the slot consumer derives from the right handle', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX fails for handle checks when the handle is not present', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          foo: out Foo {}
          root: consume Slot
            slotToProvide: provide Slot
          check slotToProvide data is from handle foo
        particle P2
          slotToConsume: consume Slot
        recipe R
          root: slot 'rootslotid-root'
          P1
            foo: out h
            root: consume root
              slotToProvide: provide slot0
          P2
            slotToConsume: consume slot0
      `);
      markParticlesWithIngress(graph, 'P2');
      assertGraphFailures(graph, [`'check slotToProvide data is from handle foo' failed for path: P2.slotToConsume`]);
    }));
    it('fails for handle checks when the handle is not present', Flags.withPreSlandlesSyntax(async () => {
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
      markParticlesWithIngress(graph, 'P2');
      assertGraphFailures(graph, [`'check slotToProvide data is from handle foo' failed for path: P2.slotToConsume`]);
    }));
  });

  describe('cycles', () => {
    it('SLANDLES SYNTAX supports tag checks in a single-particle cycle', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input: in Foo {}
          output: out Foo {}
          check input is trusted
          claim output is trusted
        recipe R
          P
            input: in h
            output: out h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('supports tag checks in a single-particle cycle', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input
          out Foo {} output
          check input is trusted
          claim output is trusted
        recipe R
          P
            input <- h
            output -> h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('SLANDLES SYNTAX supports tag checks in a single-particle cycle', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input: in Foo {}
          output: out Foo {}
          check input is trusted
          claim output is trusted
        recipe R
          P
            input: in h
            output: out h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('supports tag checks in a single-particle cycle', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input
          out Foo {} output
          check input is trusted
          claim output is trusted
        recipe R
          P
            input <- h
            output -> h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX supports handle checks tags in a single-particle cycle', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input: in Foo {}
          output: out Foo {}
          check input is from handle output
        recipe R
          P
            input: in h
            output: out h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it('supports handle checks tags in a single-particle cycle', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input
          out Foo {} output
          check input is from handle output
        recipe R
          P
            input <- h
            output -> h
      `);
      markParticlesWithIngress(graph, 'P');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX works with simple two-particle cycles', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          input: in Foo {}
          output: out Foo {}
          check input is trusted
          claim output is trusted
        particle P2
          input: in Foo {}
          output: out Foo {}
          check input is trusted
        recipe R
          P1
            input: in h1
            output: out h2
          P2
            input: in h2
            output: out h1
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('works with simple two-particle cycles', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Foo {} input
          out Foo {} output
          check input is trusted
          claim output is trusted
        particle P2
          in Foo {} input
          out Foo {} output
          check input is trusted
        recipe R
          P1
            input <- h1
            output -> h2
          P2
            input <- h2
            output -> h1
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it(`SLANDLES SYNTAX supports breaking cycles using 'derives from' claims`, Flags.withPostSlandlesSyntax(async () => {
      const runWithCheck = async (check: string) => {
        const graph = await buildFlowGraph(`
          particle P
            input1: in Foo {}
            input2: in Foo {}
            output1: out Foo {}
            output2: out Foo {}
            claim output1 derives from input1 and is a
            claim output2 derives from input2 and is b
            check input2 ${check}
          recipe R
            P
              input1: in h1
              input2: in h2
              output1: out h1
              output2: out h2
        `);
        markParticlesWithIngress(graph, 'P');
        return validateGraph(graph).isValid;
      };

      assert.isFalse(await runWithCheck('is a'));
      assert.isTrue(await runWithCheck('is b'));
      assert.isFalse(await runWithCheck('is from handle input1'));
      assert.isTrue(await runWithCheck('is from handle input2'));
    }));

    it(`supports breaking cycles using 'derives from' claims`, Flags.withPreSlandlesSyntax(async () => {
      const runWithCheck = async (check: string) => {
        const graph = await buildFlowGraph(`
          particle P
            in Foo {} input1
            in Foo {} input2
            out Foo {} output1
            out Foo {} output2
            claim output1 derives from input1 and is a
            claim output2 derives from input2 and is b
            check input2 ${check}
          recipe R
            P
              input1 <- h1
              input2 <- h2
              output1 -> h1
              output2 -> h2
        `);
        markParticlesWithIngress(graph, 'P');
        return validateGraph(graph).isValid;
      };

      assert.isFalse(await runWithCheck('is a'));
      assert.isTrue(await runWithCheck('is b'));
      assert.isFalse(await runWithCheck('is from handle input1'));
      assert.isTrue(await runWithCheck('is from handle input2'));
    }));

    it('SLANDLES SYNTAX tags propagate throughout overlapping cycles', Flags.withPostSlandlesSyntax(async () => {
      // Two cycles: P1-P2-P3 and P1-P2-P4. One cycle is tagged with a, the
      // other is tagged with b. All paths should be a or b, but not all paths
      // are a, and not all paths are b.
      const runWithCheck = async (check: string) => {
        const graph = await buildFlowGraph(`
          particle P1
            input1: in Foo {}
            input2: in Foo {}
            output1: out Foo {}
            output2: out Foo {}
            check input1 ${check}
            check input2 ${check}
            claim output1 is a
            claim output2 is b
          particle P2
            input1: in Foo {}
            input2: in Foo {}
            output1: out Foo {}
            output2: out Foo {}
            check input1 ${check}
            check input2 ${check}
          particle P3
            input: in Foo {}
            output: out Foo {}
            check input ${check}
          particle P4
            input: in Foo {}
            output: out Foo {}
            check input ${check}
          recipe R
            P1
              input1: in h3
              input2: in h6
              output1: out h1
              output2: out h4
            P2
              input1: in h1
              input2: in h5
              output1: out h2
              output2: out h6
            P3
              input: in h2
              output: out h3
            P4
              input: in h4
              output: out h5
        `);
        markParticlesWithIngress(graph, 'P1');
        return validateGraph(graph).isValid;
      };

      assert.isTrue(await runWithCheck('is a or is b'));
      assert.isFalse(await runWithCheck('is a'));
      assert.isFalse(await runWithCheck('is b'));
    }));
    it('tags propagate throughout overlapping cycles', Flags.withPreSlandlesSyntax(async () => {
      // Two cycles: P1-P2-P3 and P1-P2-P4. One cycle is tagged with a, the
      // other is tagged with b. All paths should be a or b, but not all paths
      // are a, and not all paths are b.
      const runWithCheck = async (check: string) => {
        const graph = await buildFlowGraph(`
          particle P1
            in Foo {} input1
            in Foo {} input2
            out Foo {} output1
            out Foo {} output2
            check input1 ${check}
            check input2 ${check}
            claim output1 is a
            claim output2 is b
          particle P2
            in Foo {} input1
            in Foo {} input2
            out Foo {} output1
            out Foo {} output2
            check input1 ${check}
            check input2 ${check}
          particle P3
            in Foo {} input
            out Foo {} output
            check input ${check}
          particle P4
            in Foo {} input
            out Foo {} output
            check input ${check}
          recipe R
            P1
              input1 <- h3
              input2 <- h6
              output1 -> h1
              output2 -> h4
            P2
              input1 <- h1
              input2 <- h5
              output1 -> h2
              output2 -> h6
            P3
              input <- h2
              output -> h3
            P4
              input <- h4
              output -> h5
        `);
        markParticlesWithIngress(graph, 'P1');
        return validateGraph(graph).isValid;
      };

      assert.isTrue(await runWithCheck('is a or is b'));
      assert.isFalse(await runWithCheck('is a'));
      assert.isFalse(await runWithCheck('is b'));
    }));

    it(`SLANDLES SYNTAX a simple cycle doesn't prevent claims from propagating`, Flags.withPostSlandlesSyntax(async () => {
      // This test is a simple chain of particles, where the start of the chain
      // makes a claim and the end of the chain checks it, but with a cycle in
      // the middle of it. The cycle shouldn't stop the claim from propagating.
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
          claim output is trusted
        particle P2
          input1: in Foo {}
          input2: in Foo {}
          output: out Foo {}
        particle P3
          input: in Foo {}
          output1: out Foo {}
          output2: out Foo {}
        particle P4
          input: in Foo {}
          check input is trusted
        recipe R
          P1
            output: out h1
          P2
            input1: in h1
            input2: in h4
            output: out h2
          P3
            input: in h2
            output1: out h3
            output2: out h4
          P4
           input: in h3
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));
    it(`a simple cycle doesn't prevent claims from propagating`, Flags.withPreSlandlesSyntax(async () => {
      // This test is a simple chain of particles, where the start of the chain
      // makes a claim and the end of the chain checks it, but with a cycle in
      // the middle of it. The cycle shouldn't stop the claim from propagating.
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
          claim output is trusted
        particle P2
          in Foo {} input1
          in Foo {} input2
          out Foo {} output
        particle P3
          in Foo {} input
          out Foo {} output1
          out Foo {} output2
        particle P4
          in Foo {} input
          check input is trusted
        recipe R
          P1
            output -> h1
          P2
            input1 <- h1
            input2 <- h4
            output -> h2
          P3
            input <- h2
            output1 -> h3
            output2 -> h4
          P4
           input <- h3
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX two origin cycles can co-exist happily', Flags.withPostSlandlesSyntax(async () => {
      // A graph with two simple loops at the beginning (P2's outputs connected
      // to P1's inputs), each with ingress. The claim should flow through to
      // P3.
      const graph = await buildFlowGraph(`
        particle P1
          input1: in Foo {}
          input2: in Foo {}
          output: out Foo {}
          claim output is a
        particle P2
          input: in Foo {}
          output1: out Foo {}
          output2: out Foo {}
          output3: out Foo {}
        particle P3
          input: in Foo {}
          check input is a
        recipe R
          P1
            input1: in h1
            input2: in h2
            output: out h3
          P2
            input: in h3
            output1: out h1
            output2: out h2
            output3: out h4
          P3
            input: in h4
      `);
      markParticleInputsWithIngress(graph, 'P1.input1', 'P1.input2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('two origin cycles can co-exist happily', Flags.withPreSlandlesSyntax(async () => {
      // A graph with two simple loops at the beginning (P2's outputs connected
      // to P1's inputs), each with ingress. The claim should flow through to
      // P3.
      const graph = await buildFlowGraph(`
        particle P1
          in Foo {} input1
          in Foo {} input2
          out Foo {} output
          claim output is a
        particle P2
          in Foo {} input
          out Foo {} output1
          out Foo {} output2
          out Foo {} output3
        particle P3
          in Foo {} input
          check input is a
        recipe R
          P1
            input1 <- h1
            input2 <- h2
            output -> h3
          P2
            input <- h3
            output1 -> h1
            output2 -> h2
            output3 -> h4
          P3
            input <- h4
      `);
      markParticleInputsWithIngress(graph, 'P1.input1', 'P1.input2');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX tags can be removed in a simple cycle ', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          input: in Foo {}
          output: out Foo {}
          check input is trusted
          claim output is trusted
        particle P2
          input: in Foo {}
          output: out Foo {}
          claim output is not trusted
        recipe R
          P1
            input: in h1
            output: out h2
          P2
            input: in h2
            output: out h1
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check input is trusted' failed for path: P1.output -> P2.input -> P2.output -> P1.input`,
      ]);
    }));
    it('tags can be removed in a simple cycle ', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Foo {} input
          out Foo {} output
          check input is trusted
          claim output is trusted
        particle P2
          in Foo {} input
          out Foo {} output
          claim output is not trusted
        recipe R
          P1
            input <- h1
            output -> h2
          P2
            input <- h2
            output -> h1
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check input is trusted' failed for path: P1.output -> P2.input -> P2.output -> P1.input`,
      ]);
    }));

    it('SLANDLES SYNTAX tags can be removed by a cycle along a chain', Flags.withPostSlandlesSyntax(async () => {
      // We have a chain of particles P1-P2-P3, through which a tag gets
      // propagated. However, we also have a small cycle from P2.output ->
      // P2.input, which removes the tag. A check at P3 should fail.
      const graph = await buildFlowGraph(`
        particle P1
          output: out Foo {}
          claim output is trusted
        particle P2
          input1: in Foo {}
          input2: in Foo {}
          output1: out Foo {}
          output2: out Foo {}
          claim output2 is not trusted
        particle P3
          input: in Foo {}
          check input is trusted
        recipe R
          P1
            output: out h1
          P2
            input1: in h1
            input2: in h3
            output1: out h2
            output2: out h3
          P3
            input: in h2
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check input is trusted' failed for path: P1.output -> P2.input1 -> P2.output2 -> P2.input2 -> P2.output1 -> P3.input`,
      ]);
    }));
    it('tags can be removed by a cycle along a chain', Flags.withPreSlandlesSyntax(async () => {
      // We have a chain of particles P1-P2-P3, through which a tag gets
      // propagated. However, we also have a small cycle from P2.output ->
      // P2.input, which removes the tag. A check at P3 should fail.
      const graph = await buildFlowGraph(`
        particle P1
          out Foo {} output
          claim output is trusted
        particle P2
          in Foo {} input1
          in Foo {} input2
          out Foo {} output1
          out Foo {} output2
          claim output2 is not trusted
        particle P3
          in Foo {} input
          check input is trusted
        recipe R
          P1
            output -> h1
          P2
            input1 <- h1
            input2 <- h3
            output1 -> h2
            output2 -> h3
          P3
            input <- h2
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [
        `'check input is trusted' failed for path: P1.output -> P2.input1 -> P2.output2 -> P2.input2 -> P2.output1 -> P3.input`,
      ]);
    }));

    it('SLANDLES SYNTAX overlapping cycles with no ingress fail', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          input1: in Foo {}
          input2: in Foo {}
          output1: out Foo {}
          output2: out Foo {}
          claim output1 is trusted
          claim output2 is trusted
          check input1 is trusted
        recipe R
          P
            input1: in h
            input2: in h
            output1: out h
            output2: out h
      `);
      assertGraphFailures(graph, [`'check input1 is trusted' failed: no data ingress.`]);
    }));
    it('overlapping cycles with no ingress fail', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P
          in Foo {} input1
          in Foo {} input2
          out Foo {} output1
          out Foo {} output2
          claim output1 is trusted
          claim output2 is trusted
          check input1 is trusted
        recipe R
          P
            input1 <- h
            input2 <- h
            output1 -> h
            output2 -> h
      `);
      assertGraphFailures(graph, [`'check input1 is trusted' failed: no data ingress.`]);
    }));
  });

  describe('references', () => {
    it('SLANDLES SYNTAX prunes unrelated inputs', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          foo: out [Foo {}]
          bar: out [Bar {}]
          claim foo is trusted
        particle P2
          foo: in [Foo {}]
          bar: in [Bar {}]
          ref: out Reference<Foo {}>
        particle P3
          ref: in Reference<Foo {}>
          check ref is trusted
        recipe R
          P1
            foo: out h1
            bar: out h2
          P2
            foo: in h1
            bar: in h2
            ref: out h3
          P3
            ref: in h3
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('prunes unrelated inputs', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out [Foo {}] foo
          out [Bar {}] bar
          claim foo is trusted
        particle P2
          in [Foo {}] foo
          in [Bar {}] bar
          out Reference<Foo {}> ref
        particle P3
          in Reference<Foo {}> ref
          check ref is trusted
        recipe R
          P1
            foo -> h1
            bar -> h2
          P2
            foo <- h1
            bar <- h2
            ref -> h3
          P3
            ref <- h3
      `);
      markParticlesWithIngress(graph, 'P1');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('inherits claims from related outputs', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Bar {} ingress
          out Foo {} foo
          out Reference<Foo {}> ref
          claim foo is trusted
        particle P2
          in Reference<Foo {}> ref
          check ref is trusted
        recipe R
          P1
            ingress <- h1
            foo -> h2
            ref -> h3
          P2
            ref <- h3
      `);
      markParticleInputsWithIngress(graph, 'P1.ingress');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('inherits claims from related outputs', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          in Bar {} ingress
          out Foo {} foo
          out Reference<Foo {}> ref
          claim foo is trusted
        particle P2
          in Reference<Foo {}> ref
          check ref is trusted
        recipe R
          P1
            ingress <- h1
            foo -> h2
            ref -> h3
          P2
            ref <- h3
      `);
      markParticleInputsWithIngress(graph, 'P1.ingress');
      assert.isTrue(validateGraph(graph).isValid);
    }));

    it('SLANDLES SYNTAX "derives from" claims override reference pruning', Flags.withPostSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          foo: out [Foo {}]
          bar: out [Bar {}]
          claim foo is trusted
        particle P2
          foo: in [Foo {}]
          bar: in [Bar {}]
          ref: out Reference<Foo {}>
          claim ref derives from bar
        particle P3
          ref: in Reference<Foo {}>
          check ref is trusted
        recipe R
          P1
            foo: out h1
            bar: out h2
          P2
            foo: in h1
            bar: in h2
            ref: out h3
          P3
            ref: in h3
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [`'check ref is trusted' failed for path: P1.bar -> P2.bar -> P2.ref -> P3.ref`]);
    }));
    it('"derives from" claims override reference pruning', Flags.withPreSlandlesSyntax(async () => {
      const graph = await buildFlowGraph(`
        particle P1
          out [Foo {}] foo
          out [Bar {}] bar
          claim foo is trusted
        particle P2
          in [Foo {}] foo
          in [Bar {}] bar
          out Reference<Foo {}> ref
          claim ref derives from bar
        particle P3
          in Reference<Foo {}> ref
          check ref is trusted
        recipe R
          P1
            foo -> h1
            bar -> h2
          P2
            foo <- h1
            bar <- h2
            ref -> h3
          P3
            ref <- h3
      `);
      markParticlesWithIngress(graph, 'P1');
      assertGraphFailures(graph, [`'check ref is trusted' failed for path: P1.bar -> P2.bar -> P2.ref -> P3.ref`]);
    }));
  });
});
