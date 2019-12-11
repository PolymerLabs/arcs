/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Node, Edge, FlowCheck, FlowModifier} from './graph-internals.js';
import {Slot} from '../../runtime/type.js';
import {ParticleNode} from './particle-node.js';
import {SlotConnection} from '../../runtime/recipe/slot-connection.js';

export class SlotNode extends Node {
  // For now, slots can only have in-edges (from the particles that consume them).
  // TODO: These should be inout edges, because slots can bubble up user events back to these same particles.
  readonly inEdges: SlotInput[] = [];
  readonly outEdges: readonly Edge[] = [];

  readonly nodeId: string;

  // Optional check on the data entering this slot. The check is defined by the particle which provided this slot.
  check?: FlowCheck;

  constructor(nodeId: string, slot: Slot) {
    super();
    this.nodeId = nodeId;
  }

  addInEdge(edge: SlotInput) {
    this.inEdges.push(edge);
  }

  addOutEdge(edge: Edge) {
    throw new Error(`Slots can't have out-edges (yet).`);
  }

  inEdgesFromOutEdge(outEdge: Edge): never {
    throw new Error(`Slots can't have out-edges (yet).`);
  }
}

class SlotInput implements Edge {
  readonly edgeId: string;
  readonly start: ParticleNode;
  readonly end: SlotNode;
  readonly label: string;
  readonly connectionName: string;
  readonly modifier: FlowModifier;

  constructor(edgeId: string, particleNode: ParticleNode, slotNode: SlotNode, connection: SlotConnection) {
    this.edgeId = edgeId;
    this.start = particleNode;
    this.end = slotNode;
    this.connectionName = connection.name;
    this.label = `${particleNode.name}.${this.connectionName}`;
    this.modifier = FlowModifier.fromClaims(this, []);
  }

  get check(): FlowCheck | undefined {
    return this.end.check;
  }
}

export function createSlotNodes(slots: Slot[]) {
  const nodes: Map<Slot, SlotNode> = new Map();
  slots.forEach((slot, index) => {
    const nodeId = 'S' + index;
    nodes.set(slot, new SlotNode(nodeId, slot));
  });
  return nodes;
}

/** Adds a connection between the given particle and slot nodes, where the particle "consumes" the slot. */
export function addSlotConnection(particleNode: ParticleNode, slotNode: SlotNode, connection: SlotConnection, edgeId: string): Edge {
  const edge = new SlotInput(edgeId, particleNode, slotNode, connection);
  particleNode.addOutEdge(edge);
  slotNode.addInEdge(edge);
  return edge;
}
