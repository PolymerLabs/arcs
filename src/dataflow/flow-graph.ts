/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe} from '../runtime/recipe/recipe';
import {Particle} from '../runtime/recipe/particle';
import {Handle} from '../runtime/recipe/handle';
import {HandleConnection} from '../runtime/recipe/handle-connection';
import {assert} from '../platform/assert-web';

/**
 * Data structure for representing the connectivity graph of a recipe. Used to perform static analysis on a resolved recipe.
 */
export class FlowGraph {
  readonly particles: ParticleNode[];
  readonly handles: HandleNode[];
  readonly nodes: Node[];
  readonly edges: Edge[] = [];

  /** Maps from particle name to node. */
  readonly particleMap: Map<string, ParticleNode>;

  constructor(recipe: Recipe) {
    if (!recipe.isResolved()) {
      throw new Error('Recipe must be resolved.');
    }

    // Create the nodes of the graph.
    const particleNodes = createParticleNodes(recipe.particles);
    const handleNodes = createHandleNodes(recipe.handles);

    // Add edges to the nodes.
    recipe.handleConnections.forEach(connection => {
      const particleNode = particleNodes.get(connection.particle);
      const handleNode = handleNodes.get(connection.handle);
      const edge = addHandleConnection(particleNode, handleNode, connection);
      this.edges.push(edge);
    });

    this.particles = [...particleNodes.values()];
    this.handles = [...handleNodes.values()];
    this.nodes = [...this.particles, ...this.handles];
    this.particleMap = new Map(this.particles.map(n => [n.name, n]));
  }

  /** Returns a list of all pairwise particle connections, in string form: 'P1.foo -> P2.bar'. */
  get connectionsAsStrings(): string[] {
    const connections: string[] = [];
    for (const handleNode of this.handles) {
      handleNode.connectionsAsStrings.forEach(c => connections.push(c));
    }
    return connections;
  }

  /** Returns true if all checks in the graph pass. */
  validateGraph(): ValidationResult {
    const finalResult = new ValidationResult();
    for (const edge of this.edges) {
      if (edge.check) {
        const result = this.validateSingleEdge(edge);
        result.failures.forEach(f => finalResult.failures.push(f));
      }
    }
    return finalResult;
  }

  /** Validates a single check (on the given edge). Returns true if the check passes. */
  private validateSingleEdge(edgeToCheck: Edge): ValidationResult {
    assert(!!edgeToCheck.check, 'Edge does not have any check conditions.');

    const finalResult = new ValidationResult();
    const check = edgeToCheck.check;
    const startPath = BackwardsPath.fromEdge(edgeToCheck);

    // Stack of paths that need to be checked (via DFS). Other paths will be added here to be checked as we explore the graph.
    const pathStack: BackwardsPath[] = [startPath];

    while (pathStack.length) {
      const path = pathStack.pop();
      const node = path.endNode;
      // See if the end of the path satisfies the check condition.
      const result = node.evaluateCheck(check, path.endEdge, path);
      switch (result.type) {
        case CheckResultType.Success:
          // Check was met. Continue checking other paths.
          continue;
        case CheckResultType.Failure:
          // Check failed. Add failure and continue checking other paths.
          finalResult.failures.push(result.reason);
          continue;
        case CheckResultType.KeepGoing:
          // Check has not failed yet for this path yet. Add more paths to the stack and keep going.
          assert(result.checkNext.length > 0, 'Result was KeepGoing, but gave nothing else to check.');
          result.checkNext.forEach(p => pathStack.push(p));
          continue;
        default:
          assert(false, `Unknown check result: ${result}`);
      }
    }
    return finalResult;
  }
}

/** Result from validating an entire graph. */
class ValidationResult {
  failures: string[] = [];
  
  get isValid() {
    return this.failures.length === 0;
  }
}

export enum CheckResultType {
  Success,
  Failure,
  KeepGoing,
}

export type CheckResult =
    {type: CheckResultType.Success} |
    {type: CheckResultType.Failure, reason: string} |
    {type: CheckResultType.KeepGoing, checkNext: BackwardsPath[]};

/**
 * A path that walks backwards through the graph, i.e. it walks along the directed edges in the reverse direction. The path is described by the
 * nodes in the path. Class is immutable.
 */
export class BackwardsPath {
  private constructor(
      /** Nodes in the path. */
      readonly nodes: readonly Node[],
      /** Edges in the path. */
      readonly edges: readonly Edge[]) {}

  /** Constructs a new path from the given edge. */
  static fromEdge(edge: Edge) {
    return new BackwardsPath([edge.end, edge.start], [edge]);
  }

  /** Returns a copy of the current path, with an edge added to the end of it. */
  withNewEdge(edge: Edge): BackwardsPath {
    // Flip the edge around.
    const startNode = edge.end;
    const endNode = edge.start;

    assert(startNode === this.endNode, 'Edge must connect to end of path.');

    if (this.nodes.includes(endNode)) {
      throw new Error('Graph must not include cycles.');
    }

    return new BackwardsPath([...this.nodes, endNode], [...this.edges, edge]);
  }

  get startNode(): Node {
    return this.nodes[0];
  }

  get endNode(): Node {
    return this.nodes[this.nodes.length - 1];
  }

  get endEdge(): Edge {
    return this.edges[this.edges.length - 1];
  }
}

/** Creates a new node for every given particle. */
function createParticleNodes(particles: Particle[]) {
  const nodes: Map<Particle, ParticleNode> = new Map();
  particles.forEach(particle => {
    nodes.set(particle, new ParticleNode(particle));
  });
  return nodes;
}

/** Creates a new node for every given handle. */
function createHandleNodes(handles: Handle[]) {
  const nodes: Map<Handle, HandleNode> = new Map();
  handles.forEach(handle => {
    nodes.set(handle, new HandleNode(handle));
  });
  return nodes;
}

/** Adds a connection between the given particle and handle nodes. */
function addHandleConnection(particleNode: ParticleNode, handleNode: HandleNode, connection: HandleConnection): Edge {
  switch (connection.direction) {
    case 'in': {
      const edge = new ParticleInput(particleNode, handleNode, connection.name);
      particleNode.inEdges.push(edge);
      handleNode.outEdges.push(edge);
      return edge;
    }
    case 'out': {
      const edge = new ParticleOutput(particleNode, handleNode, connection.name);
      particleNode.outEdges.push(edge);
      handleNode.inEdges.push(edge);
      return edge;
    }
    case 'inout': // TODO: Handle inout directions.
    case 'host':
    default:
      throw new Error(`Unsupported connection type: ${connection.direction}`);
  }
}

/** Represents a check condition on an edge. */
export class Check {
  constructor(
      /** A list of acceptable tags. The check will fail if a different claim is found that doesn't match any tag in this list. */
      readonly acceptedTags: readonly string[]) {}

  /** Returns true if the given claim satisfies the check condition. */
  checkAgainstClaim(claim: string): boolean {
    for (const tag of this.acceptedTags) {
      if (tag === claim) {
        return true;
      }
    }
    return false;
  }

  toString(): string {
    return this.acceptedTags.join('|');
  }
}

export abstract class Node {
  abstract readonly inEdges: Edge[];
  abstract readonly outEdges: Edge[];

  abstract evaluateCheck(check: Check, edgeToCheck: Edge, path: BackwardsPath): CheckResult;

  get inNodes(): Node[] {
    return this.inEdges.map(e => e.start);
  }

  get outNodes(): Node[] {
    return this.outEdges.map(e => e.end);
  }
}

export interface Edge {
  readonly start: Node;
  readonly end: Node;
  
  /** The name of the handle this edge represents, e.g. "output1". */
  readonly handleName: string;
  
  /** The qualified name of the handle this edge represents, e.g. "MyParticle.output1". */
  readonly label: string;

  readonly claim?: string;
  readonly check?: Check;
}

class ParticleNode extends Node {
  readonly inEdges: ParticleInput[] = [];
  readonly outEdges: ParticleOutput[] = [];
  readonly name: string;

  // Maps from handle names to tags.
  readonly claims: Map<string, string>;
  readonly checks: Map<string, Check> = new Map();

  constructor(particle: Particle) {
    super();
    this.name = particle.name;
    this.claims = particle.spec.trustClaims;
    
    particle.spec.trustChecks.forEach((tags, handle) => {
      this.checks.set(handle, new Check(tags));
    });
  }

  evaluateCheck(check: Check, edgeToCheck: ParticleOutput, path: BackwardsPath): CheckResult {
    assert(this.outEdges.includes(edgeToCheck), 'Particles can only check their own out-edges.');
    
    // First check if this particle makes an explicit claim on this out-edge.
    const claim = this.claims.get(edgeToCheck.handleName);
    if (claim) {
      if (check.checkAgainstClaim(claim)) {
        return {type: CheckResultType.Success};
      } else {
        return {type: CheckResultType.Failure, reason: `Check '${check}' failed: found claim '${claim}' on '${edgeToCheck.label}' instead.`};
      }
    }

    // Next check the node's in-edges.
    if (this.inEdges.length) {
      const checkNext = this.inEdges.map(e => path.withNewEdge(e));
      return {type: CheckResultType.KeepGoing, checkNext};
    } else {
      return {type: CheckResultType.Failure, reason: `Check '${check}' failed: found untagged node.`};
    }
  }
}

class ParticleInput implements Edge {
  readonly start: Node;
  readonly end: ParticleNode;
  readonly label: string;
  readonly handleName: string;

  /* Optional check on this input. */
  readonly check?: Check;

  constructor(particleNode: ParticleNode, otherEnd: Node, inputName: string) {
    this.start = otherEnd;
    this.end = particleNode;
    this.label = `${particleNode.name}.${inputName}`;
    this.handleName = inputName;
    this.check = particleNode.checks.get(inputName);
  }
}

class ParticleOutput implements Edge {
  readonly start: ParticleNode;
  readonly end: Node;
  readonly label: string;
  readonly handleName: string;

  /* Optional claim on this output. */
  readonly claim?: string;

  constructor(particleNode: ParticleNode, otherEnd: Node, outputName: string) {
    this.start = particleNode;
    this.end = otherEnd;
    this.label = `${particleNode.name}.${outputName}`;
    this.handleName = outputName;
    this.claim = particleNode.claims.get(outputName);
  }
}

class HandleNode extends Node {
  readonly inEdges: ParticleOutput[] = [];
  readonly outEdges: ParticleInput[] = [];

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

  evaluateCheck(check: Check, edgeToCheck: ParticleInput, path: BackwardsPath): CheckResult {
    assert(this.outEdges.includes(edgeToCheck), 'Handles can only check their own out-edges.');

    // Handles can't make claims of their own (yet). Check whether this handle is untagged.
    if (this.inEdges.length) {
      const checkNext = this.inEdges.map(e => path.withNewEdge(e));
      return {type: CheckResultType.KeepGoing, checkNext};
    } else {
      return {type: CheckResultType.Failure, reason: `Check '${check}' failed: found untagged node.`};
    }
  }
}
