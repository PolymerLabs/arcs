/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Node, Edge} from './graph-internals.js';
import {ParticleOutput, ParticleInput, ParticleNode} from './particle-node.js';
import {HandleConnectionSpec} from '../../runtime/particle-spec.js';
import {CheckIsFromHandle} from '../../runtime/particle-check.js';
import {HandleConnection} from '../../runtime/recipe/handle-connection.js';
import {assert} from '../../platform/assert-web.js';
import {Handle} from '../../runtime/recipe/handle.js';

export class HandleNode extends Node {
  readonly inEdges: ParticleOutput[] = [];
  readonly outEdges: ParticleInput[] = [];
  readonly connectionSpecs: Set<HandleConnectionSpec> = new Set();

  constructor(handle: Handle) {
    super();
  }

  /** Returns a list of all pairs of particles that are connected through this handle, in string form. */
  get connectionsAsStrings(): string[] {
    const connections: string[] = [];
    this.inEdges.forEach(inEdge => {
      this.outEdges.forEach(outEdge => {
        connections.push(`${inEdge.label} -> ${outEdge.label}`);
      });
    });
    return connections;
  }

  addInEdge(edge: ParticleOutput) {
    this.inEdges.push(edge);
    this.connectionSpecs.add(edge.connectionSpec);
  }

  addOutEdge(edge: ParticleInput) {
    this.outEdges.push(edge);
    this.connectionSpecs.add(edge.connectionSpec);
  }

  inEdgesFromOutEdge(outEdge: ParticleInput): readonly ParticleOutput[] {
    assert(this.outEdges.includes(outEdge), 'Handle does not have the given out-edge.');
    return this.inEdges;
  }

  validateIsFromHandleCheck(condition: CheckIsFromHandle): boolean {
    // Check if this handle node has the desired HandleConnectionSpec. If so, it is the right handle.
    return this.connectionSpecs.has(condition.parentHandle);
  }
}

/** Creates a new node for every given handle. */
export function createHandleNodes(handles: Handle[]) {
  const nodes: Map<Handle, HandleNode> = new Map();
  handles.forEach(handle => {
    nodes.set(handle, new HandleNode(handle));
  });
  return nodes;
}

/** Adds a connection between the given particle and handle nodes. */
export function addHandleConnection(particleNode: ParticleNode, handleNode: HandleNode, connection: HandleConnection): Edge {
  switch (connection.direction) {
    case 'in': {
      const edge = new ParticleInput(particleNode, handleNode, connection);
      particleNode.addInEdge(edge);
      handleNode.addOutEdge(edge);
      return edge;
    }
    case 'out': {
      const edge = new ParticleOutput(particleNode, handleNode, connection);
      particleNode.addOutEdge(edge);
      handleNode.addInEdge(edge);
      return edge;
    }
    case 'inout': // TODO: Handle inout directions.
    case 'host':
    default:
      throw new Error(`Unsupported connection type: ${connection.direction}`);
  }
}
