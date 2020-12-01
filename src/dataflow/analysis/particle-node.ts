/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Node, Edge, FlowModifier, FlowCheck} from './graph-internals.js';
import {ClaimExpression} from '../../runtime/arcs-types/claim.js';
import {ClaimType} from '../../runtime/arcs-types/enums.js';
import {Particle, HandleConnection, Handle} from '../../runtime/recipe/lib-recipe.js';
import {assert} from '../../platform/assert-web.js';
import {HandleConnectionSpec} from '../../runtime/arcs-types/particle-spec.js';
import {Type, ReferenceType, FieldType} from '../../types/lib-types.js';
import {TypeChecker} from '../../runtime/type-checker.js';

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
  inEdgesFromOutEdge(outEdge: ParticleOutput): readonly Edge[] {
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
  check?: FlowCheck;

  constructor(edgeId: string, particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.edgeId = edgeId;
    this.start = otherEnd;
    this.end = particleNode;
    this.connectionName = connection.name;
    this.label = `${particleNode.name}.${this.connectionName}`;
    this.connectionSpec = connection.spec;
    this.modifier = FlowModifier.fromClaims(this, getClaimsFromStore(connection.handle));
  }

  get type(): Type {
    return this.connectionSpec.type;
  }
}

export class ParticleOutput implements Edge {
  readonly edgeId: string;
  readonly start: ParticleNode;
  readonly end: Node;
  readonly label: string;
  readonly connectionName: string;
  readonly connectionSpec: HandleConnectionSpec;

  readonly modifier: FlowModifier;
  readonly derivesFrom: Edge[];

  constructor(edgeId: string, particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.edgeId = edgeId;
    this.start = particleNode;
    this.end = otherEnd;
    this.connectionName = connection.name;
    this.connectionSpec = connection.spec;
    this.label = `${particleNode.name}.${this.connectionName}`;

    // TODO(b/153354605): Support field-level claims.
    const claims = getClaimsFromHandleConnection(connection.spec);
    this.modifier = FlowModifier.fromClaims(this, claims);
    this.derivesFrom = [];
  }

  get type(): Type {
    return this.connectionSpec.type;
  }

  computeDerivedFromEdges() {
    assert(this.derivesFrom.length === 0, '"Derived from" edges have already been computed.');

    if (this.connectionSpec.claims) {
      const claims = getClaimsFromHandleConnection(this.connectionSpec);
      for (const claim of claims) {
        if (claim.type === ClaimType.DerivesFrom) {
          const derivedFromEdge = this.start.inEdgesByName.get(claim.parentHandle.name);
          assert(derivedFromEdge, `Handle '${claim.parentHandle.name}' is not an in-edge.`);
          this.derivesFrom.push(derivedFromEdge);
        }
      }
    }

    if (this.derivesFrom.length === 0 && this.type.tag === 'Reference') {
      this.getEdgesCompatibleWithReference().forEach(e => this.derivesFrom.push(e));
    }
  }

  /**
   * Returns the list of edges from which the given edge could have derived. The
   * given edge must be a particle output of a Reference type. The logic behind
   * which input/output edges could be the source of an output reference is
   * described at go/arcs-dataflow-references.
   */
  private getEdgesCompatibleWithReference(): Edge[] {
    if (this.type.tag !== 'Reference') {
      assert(false, 'Must be a Reference.');
    }
    const particleNode = this.start;
    const outRef = this.type as ReferenceType<Type>;

    const result: Edge[] = [];

    // The output reference could have come from any compatible input type, or a
    // compatible input reference.
    for (const inEdge of particleNode.inEdges) {
      if (isTypeCompatibleWithReference(inEdge.type, outRef, /* canBeReference= */ true)) {
        result.push(inEdge);
      }
    }

    // The output reference could come from any compatible output type, but *not*
    // from an output reference type.
    for (const outEdge of particleNode.outEdges) {
      if (outEdge === this) {
        continue;
      }
      if (outEdge instanceof ParticleOutput && isTypeCompatibleWithReference(outEdge.type, outRef, /* canBeReference= */ false)) {
        result.push(outEdge);
      }
    }

    return result;
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

/**
 * Checks if the given type is a possible source of the given output reference.
 *
 * @param canBeReference controls whether a reference type is allowed to be the
 *     source of the output reference
 */
function isTypeCompatibleWithReference(type: Type, target: ReferenceType<Type>, canBeReference: boolean) {
  switch (type.tag) {
    case 'Entity':
      if (TypeChecker.compareTypes({type, direction: 'reads'}, {type: target.getContainedType(), direction: 'writes'})) {
        return true;
      }
      if (canBeReference) {
        // Entities can contain references. One of them might be the origin.
        for (const field of Object.values(type.getEntitySchema().fields)) {
          if (isSchemaFieldCompatibleWithReference(field, target)) {
            return true;
          }
        }
      }
      return false;
    case 'Reference':
      return canBeReference
          ? isTypeCompatibleWithReference(type.getContainedType(), target, canBeReference)
          : false;
    case 'Collection':
    case 'BigCollection':
      return isTypeCompatibleWithReference(type.getContainedType(), target, canBeReference);
    default:
      return false;
  }
}

/**
 * Checks if the given schema field is a possible source of the given output
 * reference. Equivalent to isTypeCompatibleWithReference, except handles schema
 * fields, which have no proper types, instead of actual Type objects.
 *
 * canBeReference is implicitly true when calling this method, because a schema
 * can only contain the target type via a reference (schemas can't contain whole
 * sub-entities).
 */
function isSchemaFieldCompatibleWithReference(field: FieldType, target: ReferenceType<Type>) {
  switch (field.kind) {
    case 'schema-reference': {
      const referencedType = field.getEntityType();
      if (isTypeCompatibleWithReference(referencedType, target, /* canBeReference= */ true)) {
        return true;
      }
      return false;
    }
    case 'schema-collection':
      return isSchemaFieldCompatibleWithReference(field.getFieldType(), target);
    case 'schema-primitive':
      return false;
    default:
      throw new Error(`Unsupported field: ${field}`);
  }
}

function getClaimsFromHandleConnection(spec: HandleConnectionSpec): ClaimExpression[] {
  if (!spec.claims || spec.claims.length === 0) {
    return [];
  }
  // TODO(b/153354605): Add support for field-level claims, then delete this
  // function.
  assert(
    spec.claims.length === 1 && spec.claims[0].target === spec.name,
    'Field-level claims yet not supported by DFA yet.');
  return spec.claims[0].claims;
}

function getClaimsFromStore(handle: Handle): ClaimExpression[] {
  if (!handle.claims || handle.claims.size === 0) {
    return [];
  }
  // TODO(b/153354605): Add support for field-level claims, then delete this
  // function.
  assert(
    handle.claims.size === 1 && handle.claims.keys().next().value === '',
    'Field-level claims yet not supported by DFA yet.');
  return handle.claims.values().next().value;
}
