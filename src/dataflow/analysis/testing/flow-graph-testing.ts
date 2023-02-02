/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Runtime} from '../../../runtime/runtime.js';
import {FlowGraph} from '../flow-graph.js';
import {CheckCondition} from '../../../runtime/arcs-types/check.js';
import {Edge, Node, FlowModifier} from '../graph-internals.js';

/** Constructs a FlowGraph from the recipe in the given manifest. */
export async function buildFlowGraph(manifestContent: string): Promise<FlowGraph> {
  const runtime = new Runtime();
  const manifest = await runtime.parse(manifestContent);
  assert.lengthOf(manifest.recipes, 1);
  const recipe = manifest.recipes[0];
  assert(recipe.normalize(), 'Failed to normalize recipe.');
  assert(recipe.isResolved(), 'Recipe is not resolved.');
  return new FlowGraph(recipe, manifest);
}

export class TestNode extends Node {
  readonly inEdges: TestEdge[] = [];
  readonly outEdges: TestEdge[] = [];

  constructor(readonly nodeId: string) {
    super();
  }

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
    return this.inEdges;
  }
}

export class TestEdge implements Edge {
  readonly edgeId: string;
  readonly connectionName = 'connectionName';
  modifier: FlowModifier = new FlowModifier();

  constructor(readonly start: TestNode, readonly end: TestNode, readonly label: string) {
    this.edgeId = label;
    start.outEdges.push(this);
    end.inEdges.push(this);
  }
}
