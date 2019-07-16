/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FlowGraph} from './flow-graph.js';
import {assert} from '../../platform/assert-web.js';
import {BackwardsPath, allInputPaths} from './graph-traversal.js';
import {Edge, Flow} from './graph-internals.js';

/** Result from validating an entire graph. */
export class ValidationResult {
  failures: string[] = [];

  get isValid() {
    return this.failures.length === 0;
  }
}

/** Returns true if all checks in the graph pass. */
export function validateGraph(graph: FlowGraph): ValidationResult {
  const finalResult = new ValidationResult();
  for (const edge of graph.edges) {
    if (edge.check) {
      const result = validateSingleEdge(edge);
      result.failures.forEach(f => finalResult.failures.push(f));
    }
  }
  return finalResult;
}

/** 
 * Validates a single check (on the given edge). We define validation as
 * every path ending at the edge must pass the check on that edge. 
 * Returns true if the check passes.
 */
function validateSingleEdge(edgeToCheck: Edge): ValidationResult {
  assert(!!edgeToCheck.check, 'Edge does not have any check conditions.');

  const check = edgeToCheck.check;

  const finalResult = new ValidationResult();

  // Check every input path into the given edge.
  // NOTE: This is very inefficient. We check every single check condition against every single edge in every single input path.
  for (const path of allInputPaths(edgeToCheck)) {
    const flow = computeFlowForPath(path);
    if (!flow.evaluateCheck(check)) {
      finalResult.failures.push(`'${check.originalCheck.toManifestString()}' failed for path: ${path.toString()}`);
    }
  }

  return finalResult;
}

/**
 * Collects all the tags, nodes and edges along the given path, canceling tag claims that are
 * negated by "not" claims for the same tag downstream in the path, and ignoring
 * "not" claims without corresponding positive claims upstream, as these dangling
 * "not" claims are irrelevant for the given path. Note that "derives from" claims
 * only prune paths, and are dealt with during path generation, so they are ignored.
 */
function computeFlowForPath(path: BackwardsPath): Flow {
  const flow = new Flow();
  for (const edge of path.edgesInForwardDirection()) {
    if (edge.modifier) {
      flow.modify(edge.modifier);
    }
  }
  return flow;
}
