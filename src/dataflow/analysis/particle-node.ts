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
import {Claim, ClaimType} from '../../runtime/particle-claim.js';
import {Check} from '../../runtime/particle-check.js';
import {Particle} from '../../runtime/recipe/particle.js';
import {assert} from '../../platform/assert-web.js';
import {HandleConnectionSpec} from '../../runtime/particle-spec.js';
import {HandleConnection} from '../../runtime/recipe/handle-connection.js';

export class ParticleNode extends Node {
  readonly inEdgesByName: Map<string, ParticleInput> = new Map();
  readonly outEdgesByName: Map<string, Edge> = new Map();

  readonly name: string;

  // Maps from handle names to tags.
  readonly claims: Map<string, Claim>;
  readonly checks: Check[];

  constructor(particle: Particle) {
    super();
    this.name = particle.name;
    this.claims = particle.spec.trustClaims;
    this.checks = particle.spec.trustChecks;
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
  inEdgesFromOutEdge(outEdge: Edge): readonly ParticleInput[] {
    assert(this.outEdges.includes(outEdge), 'Particle does not have the given out-edge.');

    if (outEdge.claim && outEdge.claim.type === ClaimType.DerivesFrom) {
      const result: ParticleInput[] = [];
      for (const parentHandle of outEdge.claim.parentHandles) {
        const inEdge = this.inEdgesByName.get(parentHandle.name);
        assert(!!inEdge, `Claim derives from unknown handle: ${parentHandle}.`);
        result.push(inEdge);
      }
      return result;
    }

    return this.inEdges;
  }
}

export class ParticleInput implements Edge {
  readonly start: Node;
  readonly end: ParticleNode;
  readonly label: string;
  readonly connectionName: string;
  readonly connectionSpec: HandleConnectionSpec;

  /* Optional check on this input. */
  readonly check?: Check;

  constructor(particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.start = otherEnd;
    this.end = particleNode;
    this.connectionName = connection.name;
    this.label = `${particleNode.name}.${this.connectionName}`;
    this.check = connection.spec.check;
    this.connectionSpec = connection.spec;
  }
}

export class ParticleOutput implements Edge {
  readonly start: ParticleNode;
  readonly end: Node;
  readonly label: string;
  readonly connectionName: string;
  readonly connectionSpec: HandleConnectionSpec;

  readonly claim?: Claim;

  constructor(particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.start = particleNode;
    this.end = otherEnd;
    this.connectionName = connection.name;
    this.connectionSpec = connection.spec;
    this.label = `${particleNode.name}.${this.connectionName}`;
    this.claim = particleNode.claims.get(this.connectionName);
  }
}

/** Creates a new node for every given particle. */
export function createParticleNodes(particles: Particle[]) {
  const nodes: Map<Particle, ParticleNode> = new Map();
  particles.forEach(particle => {
    nodes.set(particle, new ParticleNode(particle));
  });
  return nodes;
}
