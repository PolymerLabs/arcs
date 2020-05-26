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
import {DeepSet} from './deep-set.js';
import {OrderedSet} from './ordered-set.js';
import {assert} from '../../platform/assert-web.js';

/**
 * Represents the set of implicit and explicit claims that flow along a path in
 * the graph, i.e. tags, node IDs and edge IDs.
 */
export class Flow {
  constructor(
      readonly nodeIds: Set<string> = new Set(),
      readonly edgeIds: OrderedSet<string> = new OrderedSet(),
      readonly tags: Set<string> = new Set()) {}

  /** Modifies the current Flow (in place) by applying the given FlowModifier. */
  modify(modifier: FlowModifier) {
    this.edgeIds.addAll(modifier.edgeIds);
    modifier.nodeIds.forEach(n => this.nodeIds.add(n));
    modifier.tagOperations.forEach((operation, tag) => {
      if (operation === 'add') {
        this.tags.add(tag);
      } else {
        this.tags.delete(tag);
      }
    });
  }

  copy(): Flow {
    return new Flow(new Set(this.nodeIds), this.edgeIds.copy(), new Set(this.tags));
  }

  copyAndModify(modifier: FlowModifier) {
    const copy = this.copy();
    copy.modify(modifier);
    return copy;
  }

  /** Evaluates the given FlowCheck against the current Flow. */
  evaluateCheck(check: FlowCheck): boolean {
    if ('operator' in check) {
      switch (check.operator) {
        case 'or':
          // Only one child expression needs to pass.
          return check.children.some(childExpr => this.evaluateCheck(childExpr));
        case 'and':
          // 'and' operator. Every child expression needs to pass.
          return check.children.every(childExpr => this.evaluateCheck(childExpr));
        case 'implies': {
          assert(check.children.length === 2, 'Implications must have exactly 2 children.');
          const [antecedent, consequent] = check.children;
          // If the antecendent is true then we need to check the consequent.
          // If it's not then the entire check passes.
          return this.evaluateCheck(antecedent) ? this.evaluateCheck(consequent) : true;
        }
        default:
          throw new Error(`Unknown FlowCheck operator: ${check.operator}`);
      }
    } else {
      return this.checkCondition(check);
    }
  }

  /** Evaluates the given CheckCondition against the current Flow. */
  private checkCondition(condition: FlowCondition): boolean {
    let result: boolean;
    switch (condition.type) {
      case 'node':
        result = this.nodeIds.has(condition.value);
        break;
      case 'edge':
        result = this.edgeIds.has(condition.value);
        break;
      case 'tag':
        result = this.tags.has(condition.value);
        break;
      default:
        throw new Error('Unknown condition type.');
    }
    // Flip the result if the check condition was negated.
    return condition.negated ? !result : result;
  }

  toUniqueString(): string {
    const elements: string[] = [];
    for (const nodeId of this.nodeIds) {
      elements.push('node:' + nodeId);
    }
    for (const tag of this.tags) {
      elements.push('tag:' + tag);
    }

    // NOTE: We use asSet() here for the edge IDs instead of asList(), and thus
    // treat all different orderings of edges (i.e. paths) as equivalent,
    // provided they visit the exact same edges. This helps dedupe visiting
    // the same series of cycles in different orders, significantly reducing the
    // search space.
    for (const edgeId of this.edgeIds.asSet()) {
      elements.push('edge:' + edgeId);
    }

    elements.sort();
    return '{' + elements.join(', ') + '}';
  }
}

/** A set of unique flows. */
export class FlowSet extends DeepSet<Flow> {
  /**
   * Copies the current FlowSet, and applies the given modifier to every flow in
   * the copy.
   */
  copyAndModify(modifier: FlowModifier) {
    return this.map(flow => flow.copyAndModify(modifier));
  }
}

export enum TagOperation {
  Add = 'add',
  Remove = 'remove',
}

/** Represents a sequence of modifications that can be made to a flow. */
export class FlowModifier {
  constructor(
      /** Node IDs to add. */
      readonly nodeIds: Set<string> = new Set(),

      /** Edge IDs to add. */
      readonly edgeIds: OrderedSet<string> = new OrderedSet(),

      /** Tags to add/remove. Maps from tag name to operation. */
      readonly tagOperations: Map<string, TagOperation> = new Map()) {}

  /**
   * Creates a new FlowModifier from the given list of strings. Each string must
   * start with either a plus or minus symbol (indicating whether the condition
   * is added or removed), then give one of 'tag', 'node', or 'edge', followed
   * by the tag/node/edge ID respectively. (Tags can be added or removed. Nodes
   * and edges can only be added.) e.g. '+node:P2', '+edge:E1', '-tag:trusted'.
   */
  static parse(...conditions: string[]): FlowModifier {
    const modifier = new FlowModifier();
    for (const condition of conditions) {
      const firstChar = condition[0];
      if (!'+-'.includes(firstChar)) {
        throw new Error(`'${condition}' must start with either + or -`);
      }
      const operator = firstChar === '+' ? TagOperation.Add : TagOperation.Remove;
      const [type, value] = condition.slice(1).split(':', 2);
      if (operator === TagOperation.Remove && type !== 'tag') {
        throw new Error(`The - operator can only be used with tags. Got '${condition}'.`);
      }
      switch (type) {
        case 'tag':
          modifier.tagOperations.set(value, operator);
          break;
        case 'node':
          modifier.nodeIds.add(value);
          break;
        case 'edge':
          modifier.edgeIds.add(value);
          break;
        default:
          throw new Error(`Unknown type: '${condition}'`);
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

  copy(): FlowModifier {
    return new FlowModifier(new Set(this.nodeIds), this.edgeIds.copy(), new Map(this.tagOperations));
  }

  /** Copies the current FlowModifier, and then applies the given modifications to the copy. */
  copyAndModify(modifier: FlowModifier) {
    const copy = this.copy();
    copy.edgeIds.addAll(modifier.edgeIds);
    modifier.nodeIds.forEach(n => copy.nodeIds.add(n));
    modifier.tagOperations.forEach((op, tag) => copy.tagOperations.set(tag, op));
    return copy;
  }

  toFlow(): Flow {
    const flow = new Flow();
    flow.modify(this);
    return flow;
  }

  toUniqueString(): string {
    const elements: string[] = [];
    // The edgeIds list is ordered, but for de-duping we still want to sort them.
    for (const edgeId of this.edgeIds.asSet()) {
      elements.push('+edge:' + edgeId);
    }
    for (const nodeId of this.nodeIds) {
      elements.push('+node:' + nodeId);
    }
    for (const [tag, op] of this.tagOperations) {
      const sign = op === TagOperation.Add ? '+' : '-';
      elements.push(sign + 'tag:' + tag);
    }
    elements.sort();
    return '{' + elements.join(', ') + '}';
  }
}

/** A set of FlowModifiers. */
export class FlowModifierSet extends DeepSet<FlowModifier> {
  /** Copies the current FlowModifierSet, and extends each modifier in the copy with the given extra modifier. */
  copyAndModify(extraModifier: FlowModifier) {
    return this.map(modifier => modifier.copyAndModify(extraModifier));
  }
}

/** An equivalent of a particle CheckCondition, used internally by FlowGraph. */
export type FlowCondition = {
  type: 'node' | 'edge' | 'tag',
  value: string,
  /**
   * Indicates whether the condition is negated, i.e. check that this tag is
   * *not* present.
   */
  negated: boolean,
};

/** An equivalent of a particle Check statement, used internally by FlowGraph. Either a FlowCondition, or a boolean expression. */
export type FlowCheck =
    (FlowCondition | {operator: 'or' | 'and' | 'implies', children: readonly FlowCheck[]})
    /** Optional Check object from which this FlowCheck was constructed. */
    & {originalCheck?: Check};

/** Represents a node in a FlowGraph. Can be a particle, handle, etc. */
export abstract class Node {
  /** A unique ID for this node. No other node in this graph can have this ID. */
  abstract readonly nodeId: string;

  /**
   * Boolean indicating whether this node has direct ingress or not (e.g. from a
   * external datastore).
   */
  ingress = false;

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

  readonly modifier: FlowModifier;
  check?: FlowCheck;
}
