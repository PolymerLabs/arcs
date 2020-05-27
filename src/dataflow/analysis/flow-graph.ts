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
import {ParticleNode, createParticleNodes, ParticleOutput, ParticleInput} from './particle-node.js';
import {HandleNode, createHandleNodes, addHandleConnection} from './handle-node.js';
import {SlotNode, createSlotNodes, addSlotConnection} from './slot-node.js';
import {Node, Edge, FlowCondition, FlowCheck} from './graph-internals.js';
import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/assert-web.js';
import {HandleConnectionSpecInterface, StoreReference, CheckIsFromHandle, CheckIsFromOutput, CheckIsFromStore, CheckType, CheckCondition, CheckExpression, Check} from '../../runtime/particle-check.js';

/**
 * Data structure for representing the connectivity graph of a recipe. Used to perform static analysis on a resolved recipe.
 */
export class FlowGraph {
  readonly particles: ParticleNode[];
  readonly handles: HandleNode[];
  readonly slots: SlotNode[];
  readonly nodes: Node[];

  /** Maps from edge ID to Edge. */
  readonly edgeMap: Map<string, Edge> = new Map();

  /** Maps from particle name to node. */
  readonly particleMap: Map<string, ParticleNode>;

  /** Maps from HandleConnectionSpecInterface to HandleNode. */
  private readonly handleSpecMap: Map<HandleConnectionSpecInterface, HandleNode> = new Map();

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
      this.handleSpecMap.set(connection.spec, handleNode);

      // Function to construct a new edge in the graph.
      const addEdgeWithDirection = (direction: 'in' | 'out') => {
        const edgeId = 'E' + edgeIdCounter++;
        const edge = addHandleConnection(direction, particleNode, handleNode, connection, edgeId);
        this.edgeMap.set(edgeId, edge);
      };

      if (connection.direction === 'reads writes') {
        // An inout handle connection is represented by two edges.
        addEdgeWithDirection('in');
        addEdgeWithDirection('out');
      } else if (connection.direction === 'reads') {
        addEdgeWithDirection('in');
      } else if (connection.direction === 'writes') {
        addEdgeWithDirection('out');
      } else {
        throw new Error(`Unsupported handle connection direction: ${connection.direction}`);
      }
    });

    // Add edges from particles to the slots that they consume (one-way only, for now).
    recipe.slotConnections.forEach(connection => {
      const particleNode = particleNodes.get(connection.particle);
      const slotNode = slotNodes.get(connection.targetSlot);
      const edgeId = 'E' + edgeIdCounter++;
      const edge = addSlotConnection(particleNode, slotNode, connection, edgeId);
      this.edgeMap.set(edgeId, edge);

      // Copy the Check object from the "provide" connection onto the SlotNode.
      // (Checks are defined by the particle that provides the slot, but are
      // applied to the particle that consumes the slot.)
      for (const providedSlotSpec of connection.getSlotSpec().provideSlotConnections) {
        const providedSlot = connection.providedSlots[providedSlotSpec.name];
        const providedSlotNode = slotNodes.get(providedSlot);
        providedSlotNode.check = providedSlotSpec.check ? this.createFlowCheck(providedSlotSpec.check) : null;
      }
    });

    this.edges.forEach(edge => {
      // Attach check objects to particle in-edges. Must be done in a separate
      // pass after all edges have been created, since checks can reference
      // other nodes/edges.
      if (edge instanceof ParticleInput && edge.connectionSpec.check) {
        edge.check = this.createFlowCheck(edge.connectionSpec.check);
      }

      // Compute the list of 'derived from' edges for all out-edges. This must
      // also be done in a separate pass since we can't guarantee the ordering
      // in which the edges were created.
      if (edge instanceof ParticleOutput) {
        edge.computeDerivedFromEdges();
      }
    });
  }

  get edges(): readonly Edge[] {
    return [...this.edgeMap.values()];
  }

  /** Returns a list of all pairwise particle connections, in string form: 'P1.foo -> P2.bar'. */
  get connectionsAsStrings(): string[] {
    const connections: string[] = [];
    for (const handleNode of this.handles) {
      handleNode.connectionsAsStrings.forEach(c => connections.push(c));
    }
    return connections;
  }

  /** Converts a list of edge IDs into a path string using the edge labels. */
  edgeIdsToPath(edgeIds: readonly string[]) {
    return edgeIds.map(edgeId => this.edgeMap.get(edgeId).label).join(' -> ');
  }

  /** Converts an "is from handle" check into the node ID that we need to search for. */
  handleCheckToNodeId(check: CheckIsFromHandle): string {
    return this.handleSpecMap.get(check.parentHandle).nodeId;
  }

  /** Converts an "is from output" check into the edge ID that we need to search for. */
  outputCheckToEdgeId(check: CheckIsFromOutput): string {
    const edge = this.edges.find(edge => {
      if (edge instanceof ParticleOutput) {
        return (edge.connectionSpec === check.output);
      }
      return false;
    });
    assert(edge, `Output with id ${check.output.name} does not exist.`);
    return edge.edgeId;
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
    switch (expression.type) {
      case 'and':
      case 'or':
        return {
          originalCheck,
          operator: expression.type,
          children: expression.children.map(child => this.createFlowCheck(originalCheck, child)),
        };
      case CheckType.Implication:
        // Implications represented as a FlowExpression with 2 children in the
        // order [antecedent, consequent].
        return {
          originalCheck,
          operator: 'implies',
          children: [
            this.createFlowCheck(originalCheck, expression.antecedent),
            this.createFlowCheck(originalCheck, expression.consequent),
          ],
        };
      default:
        // All other CheckTypes get converted to a FlowCondition.
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
      case CheckType.IsFromOutput:
        return {type: 'edge', negated: condition.isNot, value: this.outputCheckToEdgeId(condition)};
      case CheckType.IsFromStore:
        return {type: 'node', negated: condition.isNot, value: this.storeCheckToNodeId(condition)};
      default:
        throw new Error('Unknown CheckType');
    }
  }
}
