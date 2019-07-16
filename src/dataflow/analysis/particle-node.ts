/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Node, Edge, FlowModifier, TagOperation, FlowCheck} from './graph-internals.js';
import {ClaimType, Claim, ParticleClaim, ClaimDerivesFrom} from '../../runtime/particle-claim.js';
import {Check} from '../../runtime/particle-check.js';
import {Particle} from '../../runtime/recipe/particle.js';
import {assert} from '../../platform/assert-web.js';
import {HandleConnectionSpec} from '../../runtime/particle-spec.js';
import {HandleConnection} from '../../runtime/recipe/handle-connection.js';

export class ParticleNode extends Node {
  readonly inEdgesByName: Map<string, ParticleInput> = new Map();
  readonly outEdgesByName: Map<string, Edge> = new Map();

  readonly nodeId: string;
  readonly name: string;

  constructor(nodeId: string, particle: Particle) {
    super();
    this.nodeId = nodeId;
    this.name = particle.name;
  }

  addInEdge(edge: ParticleInput) {
    this.inEdgesByName.set(edge.connectionName, edge);
  }

  addOutEdge(edge: Edge) {
    this.outEdgesByName.set(edge.connectionName, edge);
  }

  get inEdges(): readonly ParticleInput[] {
    return [...this.inEdgesByName.values()];
  }

  get outEdges(): readonly Edge[] {
    return [...this.outEdgesByName.values()];
  }

  /**
   * Iterates through all of the relevant in-edges leading into this particle, that flow out into the given out-edge. The out-edge may have a
   * 'derives from' claim that restricts which edges flow into it.
   */
  inEdgesFromOutEdge(outEdge: Edge): readonly Edge[] {
    assert(this.outEdges.includes(outEdge), 'Particle does not have the given out-edge.');

    if (outEdge.derivesFrom && outEdge.derivesFrom.length) {
      return outEdge.derivesFrom;
    }

    return this.inEdges;
  }
}

export class ParticleInput implements Edge {
  readonly edgeId: string;
  readonly start: Node;
  readonly end: ParticleNode;
  readonly label: string;
  readonly connectionName: string;
  readonly connectionSpec: HandleConnectionSpec;

  readonly modifier: FlowModifier;
  readonly check?: FlowCheck;

  constructor(edgeId: string, particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.edgeId = edgeId;
    this.start = otherEnd;
    this.end = particleNode;
    this.connectionName = connection.name;
    this.label = `${particleNode.name}.${this.connectionName}`;
    this.connectionSpec = connection.spec;
    this.modifier = FlowModifier.fromClaims(this, connection.handle.claims);
  }
}

export class ParticleOutput implements Edge {
  readonly edgeId: string;
  readonly start: ParticleNode;
  readonly end: Node;
  readonly label: string;
  readonly connectionName: string;

  readonly modifier: FlowModifier;
  readonly derivesFrom: ParticleInput[];

  constructor(edgeId: string, particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.edgeId = edgeId;
    this.start = particleNode;
    this.end = otherEnd;
    this.connectionName = connection.name;
    this.label = `${particleNode.name}.${this.connectionName}`;
    
    this.modifier = FlowModifier.fromClaims(this, connection.spec.claims);
    if (connection.spec.claims) {
      this.derivesFrom = [];
      for (const claim of connection.spec.claims) {
        if (claim.type === ClaimType.DerivesFrom) {
          this.derivesFrom.push(particleNode.inEdgesByName[claim.parentHandle.name]);
        }
      }
    }
  }
}

/** Creates a new node for every given particle. */
export function createParticleNodes(particles: Particle[]) {
  const nodes: Map<Particle, ParticleNode> = new Map();
  particles.forEach((particle, index) => {
    const nodeId = 'P' + index;
    nodes.set(particle, new ParticleNode(nodeId, particle));
  });
  return nodes;
}
