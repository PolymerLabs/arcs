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
import {HandleNode} from './handle-node.js';
import {CheckType, CheckExpression} from '../../runtime/particle-check.js';
import {BackwardsPath, allInputPaths} from './graph-traversal.js';
import {ClaimType} from '../../runtime/particle-claim.js';
import {Edge} from './graph-internals.js';

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
    const tagsForPath = computeTagClaimsInPath(path);
    const handlesInPath = path.nodes.filter(n => n instanceof HandleNode) as HandleNode[];
    if (!evaluateCheck(check.expression, tagsForPath, handlesInPath)) {
      finalResult.failures.push(`'${check.toManifestString()}' failed for path: ${path.toString()}`);
    }
  }

  return finalResult;
}

/**
 * Collects all the tags claimed along the given path, canceling tag claims that are
 * negated by "not" claims for the same tag downstream in the path, and ignoring
 * "not" claims without corresponding positive claims upstream, as these dangling
 * "not" claims are irrelevant for the given path. Note that "derives from" claims
 * only prune paths, and are dealt with during path generation, so they are ignored.
 */
function computeTagClaimsInPath(path: BackwardsPath): Set<string> {
  const tags: Set<string> = new Set<string>();
  // We traverse the path in the forward direction, so we can cancel correctly.
  const edgesInPath = path.edgesInForwardDirection();
  edgesInPath.forEach(e => {
    if (!e.claim || e.claim.type !== ClaimType.IsTag) {
      return;
    }
    if (!e.claim.isNot) {
      tags.add(e.claim.tag);
      return;
    }
    // Our current claim is a "not" tag claim. 
    // Ignore it if there are no preceding tag claims
    if (tags.size === 0) {
      return;
    }
    tags.delete(e.claim.tag);
  });
  return tags;
}

/** 
 * Returns true if the given check passes against one of the tag claims or one
 * one of the handles in the path. Operates recursively on boolean condition
 * trees.
 */
function evaluateCheck(checkExpression: CheckExpression, claimTags: Set<string>, handles: HandleNode[]): boolean {
  switch (checkExpression.type) {
    case 'or':
      // Only one child expression needs to pass.
      return checkExpression.children.some(childExpr => evaluateCheck(childExpr, claimTags, handles));
    case 'and':
      // Every child expression needs to pass.
      return checkExpression.children.every(childExpr => evaluateCheck(childExpr, claimTags, handles));
    case CheckType.HasTag:
      return claimTags.has(checkExpression.tag);
    case CheckType.IsFromHandle:
      return handles.some(handle => handle.validateIsFromHandleCheck(checkExpression));
    default:
      throw new Error('Unknown condition type.');
  }
}
