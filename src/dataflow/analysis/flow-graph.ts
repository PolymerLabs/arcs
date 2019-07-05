/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe} from '../../runtime/recipe/recipe.js';
import {ParticleNode, createParticleNodes} from './particle-node.js';
import {HandleNode, createHandleNodes, addHandleConnection} from './handle-node.js';
import {SlotNode, createSlotNodes, addSlotConnection} from './slot-node.js';
import {Node, Edge} from './graph-internals.js';
import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/assert-web.js';
import {StoreReference} from '../../runtime/particle-check.js';

/**
 * Data structure for representing the connectivity graph of a recipe. Used to perform static analysis on a resolved recipe.
 */
export class FlowGraph {
  readonly particles: ParticleNode[];
  readonly handles: HandleNode[];
  readonly slots: SlotNode[];
  readonly nodes: Node[];
  readonly edges: Edge[] = [];

  /** Maps from particle name to node. */
  readonly particleMap: Map<string, ParticleNode>;

  private readonly manifest: Manifest;

  constructor(recipe: Recipe, manifest: Manifest) {
    if (!recipe.isResolved()) {
      throw new Error('Recipe must be resolved.');
    }

    // Create the nodes of the graph.
    const particleNodes = createParticleNodes(recipe.particles);
    const handleNodes = createHandleNodes(recipe.handles);
    const slotNodes = createSlotNodes(recipe.slots);

    // Add edges to the nodes.
    recipe.handleConnections.forEach(connection => {
      const particleNode = particleNodes.get(connection.particle);
      const handleNode = handleNodes.get(connection.handle);
      const edge = addHandleConnection(particleNode, handleNode, connection);
      this.edges.push(edge);
    });

    // Add edges from particles to the slots that they consume (one-way only, for now).
    recipe.slotConnections.forEach(connection => {
      const particleNode = particleNodes.get(connection.particle);
      const slotNode = slotNodes.get(connection.targetSlot);
      const edge = addSlotConnection(particleNode, slotNode, connection);
      this.edges.push(edge);

      // Copy the Check object from the "provide" connection onto the SlotNode.
      // (Checks are defined by the particle that provides the slot, but are
      // applied to the particle that consumes the slot.)
      for (const providedSlotSpec of connection.getSlotSpec().provideSlotConnections) {
        const providedSlot = connection.providedSlots[providedSlotSpec.name];
        const providedSlotNode = slotNodes.get(providedSlot);
        providedSlotNode.check = providedSlotSpec.check;
      }
    });

    this.particles = [...particleNodes.values()];
    this.handles = [...handleNodes.values()];
    this.slots = [...slotNodes.values()];
    this.nodes = [...this.particles, ...this.handles, ...this.slots];
    this.particleMap = new Map(this.particles.map(n => [n.name, n]));
    this.manifest = manifest;
  }

  /** Returns a list of all pairwise particle connections, in string form: 'P1.foo -> P2.bar'. */
  get connectionsAsStrings(): string[] {
    const connections: string[] = [];
    for (const handleNode of this.handles) {
      handleNode.connectionsAsStrings.forEach(c => connections.push(c));
    }
    return connections;
  }

  resolveStoreRefToID(storeRef: StoreReference): string {
    if (storeRef.type === 'id') {
      const store = this.manifest.findStoreById(storeRef.store);
      assert(store, `Store with id '${storeRef.store}' not found.`);
      return store.id;
    } else {
      const store = this.manifest.findStoreByName(storeRef.store);
      assert(store, `Store with name ${storeRef.store} not found.`);
      return store.id;
    }
  }
}
