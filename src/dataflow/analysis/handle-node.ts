/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Node, Edge} from './graph-internals.js';
import {ParticleOutput, ParticleInput, ParticleNode} from './particle-node.js';
import {assert} from '../../platform/assert-web.js';
import {Handle, HandleConnection} from '../../runtime/recipe/lib-recipe.js';

export class HandleNode extends Node {
  readonly nodeId: string;
  readonly inEdges: ParticleOutput[] = [];
  readonly outEdges: ParticleInput[] = [];
  readonly storeId: string;

  constructor(nodeId: string, handle: Handle) {
    super();
    this.nodeId = nodeId;
    this.storeId = handle.id;

    // Handles with the 'use', 'map' or 'copy' fate can come from sources
    // external to the recipe, and so should be treated as ingress.
    if (handle.fate !== 'create') {
      this.ingress = true;
    }
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
  }

  addOutEdge(edge: ParticleInput) {
    this.outEdges.push(edge);
  }

  inEdgesFromOutEdge(outEdge: ParticleInput): readonly ParticleOutput[] {
    assert(this.outEdges.includes(outEdge), 'Handle does not have the given out-edge.');
    return this.inEdges;
  }
}

/** Creates a new node for every given handle. */
export function createHandleNodes(handles: Handle[]) {
  const nodes: Map<Handle, HandleNode> = new Map();
  handles.forEach((handle, index) => {
    const nodeId = 'H' + index;
    nodes.set(handle, new HandleNode(nodeId, handle));
  });
  return nodes;
}

/** Adds a connection between the given particle and handle nodes. */
export function addHandleConnection(
    direction: 'in' | 'out', particleNode: ParticleNode, handleNode: HandleNode, connection: HandleConnection, edgeId: string): Edge {
  if (direction === 'in') {
    const edge = new ParticleInput(edgeId, particleNode, handleNode, connection);
    particleNode.addInEdge(edge);
    handleNode.addOutEdge(edge);
    return edge;
  } else {
    const edge = new ParticleOutput(edgeId, particleNode, handleNode, connection);
    particleNode.addOutEdge(edge);
    handleNode.addInEdge(edge);
    return edge;
  }
}
