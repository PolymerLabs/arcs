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
import {Node, Edge, FlowCondition, FlowCheck} from './graph-internals.js';
import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/assert-web.js';
import {StoreReference, CheckIsFromHandle, CheckIsFromStore, CheckType, CheckCondition, CheckExpression, Check} from '../../runtime/particle-check.js';
import {HandleConnectionSpec} from '../../runtime/particle-spec.js';

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

  /** Maps from HandleConnectionSpec to edge. */
  private readonly handleSpecMap: Map<HandleConnectionSpec, Edge> = new Map();

  private readonly manifest: Manifest;

  constructor(recipe: Recipe, manifest: Manifest) {
    if (!recipe.isResolved()) {
      throw new Error('Recipe must be resolved.');
    }

    // Create the nodes of the graph.
    const particleNodes = createParticleNodes(recipe.particles);
    const handleNodes = createHandleNodes(recipe.handles);
    const slotNodes = createSlotNodes(recipe.slots);

    this.particles = [...particleNodes.values()];
    this.handles = [...handleNodes.values()];
    this.slots = [...slotNodes.values()];
    this.nodes = [...this.particles, ...this.handles, ...this.slots];
    this.particleMap = new Map(this.particles.map(n => [n.name, n]));
    this.manifest = manifest;

    let edgeIdCounter = 0;

    // Add edges to the nodes.
    recipe.handleConnections.forEach(connection => {
      const particleNode = particleNodes.get(connection.particle);
      const handleNode = handleNodes.get(connection.handle);
      const edgeId = 'E' + edgeIdCounter++;
      const edge = addHandleConnection(particleNode, handleNode, connection, edgeId);
      this.edges.push(edge);
      this.handleSpecMap.set(connection.spec, edge);
    });

    // Add edges from particles to the slots that they consume (one-way only, for now).
    recipe.slotConnections.forEach(connection => {
      const particleNode = particleNodes.get(connection.particle);
      const slotNode = slotNodes.get(connection.targetSlot);
      const edgeId = 'E' + edgeIdCounter++;
      const edge = addSlotConnection(particleNode, slotNode, connection, edgeId);
      this.edges.push(edge);

      // Copy the Check object from the "provide" connection onto the SlotNode.
      // (Checks are defined by the particle that provides the slot, but are
      // applied to the particle that consumes the slot.)
      for (const providedSlotSpec of connection.getSlotSpec().provideSlotConnections) {
        const providedSlot = connection.providedSlots[providedSlotSpec.name];
        const providedSlotNode = slotNodes.get(providedSlot);
        providedSlotNode.check = providedSlotSpec.check ? this.createFlowCheck(providedSlotSpec.check) : null;
      }
    });

    // Attach check objects to edges. Must be done in a separate pass after all
    // edges have been created, since checks can reference other nodes/edges.
    recipe.handleConnections.forEach(connection => {
      if (connection.spec.check) {
        const edge = this.handleSpecMap.get(connection.spec);
        edge.check = this.createFlowCheck(connection.spec.check);
      }
    });
  }

  /** Returns a list of all pairwise particle connections, in string form: 'P1.foo -> P2.bar'. */
  get connectionsAsStrings(): string[] {
    const connections: string[] = [];
    for (const handleNode of this.handles) {
      handleNode.connectionsAsStrings.forEach(c => connections.push(c));
    }
    return connections;
  }

  /** Converts an "is from handle" check into the node ID that we need to search for. */
  handleCheckToNodeId(check: CheckIsFromHandle): string {
    const parentEdge = this.handleSpecMap.get(check.parentHandle);
    return parentEdge.start.nodeId;
  }

  /** Converts an "is from store" check into the node ID that we need to search for. */
  storeCheckToNodeId(check: CheckIsFromStore): string {
    const storeId = this.resolveStoreRefToID(check.storeRef);
    const handle = this.handles.find(h => h.storeId === storeId);
    assert(handle, `Store with id ${storeId} is not connected by a handle.`);
    return handle.nodeId;
  }

  /** Converts a StoreReference into a store ID. */
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

  /** Converts a particle Check object into a FlowCheck object (the internal representation used by FlowGraph). */
  createFlowCheck(originalCheck: Check, expression?: CheckExpression): FlowCheck {
    expression = expression || originalCheck.expression;
    if (expression.type === 'and' || expression.type === 'or') {
      return {
        originalCheck,
        operator: expression.type,
        children: expression.children.map(child => this.createFlowCheck(originalCheck, child)),
      };
    } else {
      return {...this.createFlowCondition(expression as CheckCondition), originalCheck};
    }
  }

  /** Converts a particle CheckCondition into a FlowCondition object (the internal representation used by FlowGraph). */
  private createFlowCondition(condition: CheckCondition): FlowCondition {
    switch (condition.type) {
      case CheckType.HasTag:
        return {type: 'tag', negated: condition.isNot, value: condition.tag};
      case CheckType.IsFromHandle:
        return {type: 'node', negated: condition.isNot, value: this.handleCheckToNodeId(condition)};
      case CheckType.IsFromStore:
        return {type: 'node', negated: condition.isNot, value: this.storeCheckToNodeId(condition)};
      default:
        throw new Error('Unknown CheckType');
    }
  }
}
