/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * @fileoverview
 * FlowGraph internals
 *
 * This file contains the data structures that are meant to be internal to the
 * FlowGraph class. They have been moved into a separate file to break circular
 * dependencies between FlowGraph, Node/Edge, and the concrete implementations
 * of Node/Edge like ParticleNode, etc.
 */

import {Claim, ClaimType} from '../../runtime/particle-claim.js';
import {Check} from '../../runtime/particle-check.js';

/**
 * Represents the set of implicit and explicit claims that flow along a path in
 * the graph, i.e. tags, node IDs and edge IDs.
 */
export class Flow {
  readonly nodeIds: Set<string> = new Set();
  readonly edgeIds: Set<string> = new Set();
  readonly tags: Set<string> = new Set();

  /** Modifies the current Flow (in place) by applying the given FlowModifier. */
  modify(modifier: FlowModifier) {
    modifier.nodeIds.forEach(n => this.nodeIds.add(n));
    modifier.edgeIds.forEach(e => this.edgeIds.add(e));
    modifier.tagOperations.forEach((operation, tag) => {
      if (operation === 'add') {
        this.tags.add(tag);
      } else {
        this.tags.delete(tag);
      }
    });
  }

  /** Evaluates the given FlowCheck against the current Flow. */
  evaluateCheck(check: FlowCheck): boolean {
    if ('operator' in check) {
      if (check.operator === 'or') {
        // Only one child expression needs to pass.
        return check.children.some(childExpr => this.evaluateCheck(childExpr));
      } else {
        // 'and' operator. Every child expression needs to pass.
        return check.children.every(childExpr => this.evaluateCheck(childExpr));
      }
    } else {
      return this.checkCondition(check);
    }
  }

  /** Evaluates the given CheckCondition against the current Flow. */
  private checkCondition(condition: FlowCondition): boolean {
    switch (condition.type) {
      case 'node':
        return this.nodeIds.has(condition.value);
      case 'edge':
        return this.edgeIds.has(condition.value);
      case 'tag':
        return this.tags.has(condition.value);
      default:
        throw new Error('Unknown condition type.');
    }
  }
}

export enum TagOperation {
  Add = 'add',
  Remove = 'remove',
}

/** Represents a sequence of modifications that can be made to a flow. */
export class FlowModifier {
  /** Node IDs to add. */
  readonly nodeIds: Set<string> = new Set();

  /** Edge IDs to add. */
  readonly edgeIds: Set<string> = new Set();

  /** Tags to add/remove. Maps from tag name to operation. */
  readonly tagOperations: Map<string, TagOperation> = new Map();

  static fromConditions(...conditions: FlowCondition[]): FlowModifier {
    const modifier = new FlowModifier();
    for (const condition of conditions) {
      switch (condition.type) {
        case 'tag':
          modifier.tagOperations.set(condition.value, TagOperation.Add);
          break;
        case 'node':
          modifier.nodeIds.add(condition.value);
          break;
        case 'edge':
          modifier.edgeIds.add(condition.value);
          break;
        default:
          throw new Error('Unknown FlowCondition type.');
      }
    }
    return modifier;
  }

  static fromClaims(edge: Edge, claims: Claim[]): FlowModifier {
    const modifier = new FlowModifier();
    if (claims) {
      for (const claim of claims) {
        if (claim.type === ClaimType.IsTag) {
          modifier.tagOperations.set(claim.tag, claim.isNot ? TagOperation.Remove : TagOperation.Add);
        }
      }
    }
    modifier.edgeIds.add(edge.edgeId);
    modifier.nodeIds.add(edge.start.nodeId);
    return modifier;
  }
}

/** An equivalent of a particle CheckCondition, used internally by FlowGraph. */
export type FlowCondition = {
  type: 'node' | 'edge' | 'tag',
  value: string
};

/** An equivalent of a particle Check statement, used internally by FlowGraph. Either a FlowCondition, or a boolean expression. */
export type FlowCheck = 
    (FlowCondition | {operator: 'or' | 'and', children: readonly FlowCheck[]})
    /** Optional Check object from which this FlowCheck was constructed. */
    & {originalCheck?: Check};

/** Represents a node in a FlowGraph. Can be a particle, handle, etc. */
export abstract class Node {
  /** A unique ID for this node. No other node in this graph can have this ID. */
  abstract readonly nodeId: string;

  abstract readonly inEdges: readonly Edge[];
  abstract readonly outEdges: readonly Edge[];

  abstract addInEdge(edge: Edge): void;
  abstract addOutEdge(edge: Edge): void;

  get inNodes(): Node[] {
    return this.inEdges.map(e => e.start);
  }

  get outNodes(): Node[] {
    return this.outEdges.map(e => e.end);
  }

  abstract inEdgesFromOutEdge(outEdge: Edge): readonly Edge[];
}

/**
 * Represents an edge in a FlowGraph, i.e. a connection between particles,
 * handles, etc.
 */
export interface Edge {
  /** A unique ID for this edge. No other edge in this graph can have this ID. */
  readonly edgeId: string;

  readonly start: Node;
  readonly end: Node;

  /** The name of the handle/slot this edge represents, e.g. "output1". */
  readonly connectionName: string;

  /**
   * The qualified name of the handle/slot this edge represents,
   * e.g. "MyParticle.output1".
   */
  readonly label: string;

  readonly derivesFrom?: Edge[];
  readonly modifier?: FlowModifier;
  check?: FlowCheck;
}
