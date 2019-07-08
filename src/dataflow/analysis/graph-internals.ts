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

import {Claim, ClaimExpression} from '../../runtime/particle-claim.js';
import {Check} from '../../runtime/particle-check.js';

/** Represents a node in a FlowGraph. Can be a particle, handle, etc. */
export abstract class Node {
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
  readonly start: Node;
  readonly end: Node;

  /** The name of the handle/slot this edge represents, e.g. "output1". */
  readonly connectionName: string;

  /**
   * The qualified name of the handle/slot this edge represents,
   * e.g. "MyParticle.output1".
   */
  readonly label: string;

  readonly claim?: ClaimExpression;
  readonly check?: Check;
}
