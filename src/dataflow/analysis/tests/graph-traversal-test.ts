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
import {Node} from '../graph-internals.js';
import {BackwardsPath} from '../graph-traversal.js';
import {TestNode, TestEdge} from '../testing/flow-graph-testing.js';

describe('BackwardsPath', () => {
  // Construct directed graph: A -> B -> C.
  const nodeA = new TestNode('A');
  const nodeB = new TestNode('B');
  const nodeC = new TestNode('C');
  const edgeAToB = new TestEdge(nodeA, nodeB, 'A -> B');
  const edgeBToC = new TestEdge(nodeB, nodeC, 'B -> C');
  const edgeCToA = new TestEdge(nodeC, nodeA, 'C -> A');

  it('starts with a single edge', () => {
    const path = BackwardsPath.fromEdge(edgeAToB);

    assert.sameOrderedMembers(path.nodes as Node[], [nodeB, nodeA]);
    assert.strictEqual(path.startNode, nodeB);
    assert.strictEqual(path.endNode, nodeA);
    assert.strictEqual(path.endEdge, edgeAToB);
  });

  it('can add another edge to the end of the path', () => {
    let path = BackwardsPath.fromEdge(edgeBToC);
    path = path.withNewEdge(edgeAToB);

    assert.sameOrderedMembers(path.nodes as Node[], [nodeC, nodeB, nodeA]);
    assert.strictEqual(path.startNode, nodeC);
    assert.strictEqual(path.endNode, nodeA);
    assert.strictEqual(path.endEdge, edgeAToB);
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

// TODO: Add tests for the allInputPaths function.
