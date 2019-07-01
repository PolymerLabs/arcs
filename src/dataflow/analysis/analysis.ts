/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FlowGraph, Edge} from './flow-graph';
import {assert} from '../../platform/assert-web';
import {HandleNode} from './handle-node';
import {Check, CheckCondition, CheckType} from '../../runtime/particle-check';
import {BackwardsPath, allInputPaths} from './graph-traversal';
import {ClaimType} from '../../runtime/particle-claim';

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
  const conditions = checkToConditionList(check);

  const finalResult = new ValidationResult();

  // Check every input path into the given edge.
  // NOTE: This is very inefficient. We check every single check condition against every single edge in every single input path.
  for (const path of allInputPaths(edgeToCheck)) {
    const tagsForPath = computeTagClaimsInPath(path);
    const handlesInPath = path.nodes.filter(n => n instanceof HandleNode) as HandleNode[];
    if (!evaluateCheck(conditions, tagsForPath, handlesInPath)) {
      finalResult.failures.push(`'${check.toManifestString()}' failed for path: ${path.toString()}`);
    }
  }

  return finalResult;
}

/**
 * Preprocess a check into a list of conditions. This will need to change when
 * we implement complex boolean expressions.
 */
function checkToConditionList(check: Check): CheckCondition[] {
  // TODO: Support boolean expression trees properly! Currently we only deal with a single string of OR'd conditions.
   const conditions: CheckCondition[] = [];
   switch (check.expression.type) {
     case 'and':
       throw new Error(`Boolean expressions with 'and' are not supported yet.`);
     case 'or':
       for (const child of check.expression.children) {
         assert(child.type !== 'or' && child.type !== 'and', 'Nested boolean expressions are not supported yet.');
         conditions.push(child as CheckCondition);
       }
       break;
     default:
       // Expression is just a single condition.
       conditions.push(check.expression);
       break;
   }
   return conditions;
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
 * one of the handles in the path. Only one condition needs to pass.
 */
function evaluateCheck(conditions: CheckCondition[], claimTags: Set<string>, handles: HandleNode[]): boolean {
  // Check every condition against the set of tag claims. If it fails, check
  // against the handles
  for (const condition of conditions) {
    switch (condition.type) {
      case CheckType.HasTag:
        if (claimTags.has(condition.tag)) {
          return true;
        }
        break;
      case CheckType.IsFromHandle:
        // Do any of the handles in the path contain the condition handle as
        // an output handle?
        for (const handle of handles) {
          if (handle.validateIsFromHandleCheck(condition)) {
            return true;
          }
        }
        break;
      default:
        throw new Error('Unknown condition type.');
    }
  }
  return false;
}
