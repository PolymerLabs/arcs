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
    const startPath = BackwardsPath.newPathWithOpenEdge(edgeToCheck);

    // Stack of paths that need to be checked (via DFS). Other paths will be added here to be checked as we explore the graph.
    const pathStack: BackwardsPath[] = [startPath];

    while (pathStack.length) {
      const path = pathStack.pop();
      // See if the end of the path satisfies the check condition.
      const result = path.end.evaluateCheck(check, path);
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
 * 
 * The path can have an open or closed edge at the end. An open edge points to the final node in the path, but does not actually include it.
 */
export class BackwardsPath {
  private constructor(
      /** Nodes in the path. */
      readonly nodes: readonly Node[],
      /**
       * Optional open edge at the end of the path. If the path is closed, this will be null, and the end of the path is given by the last node
       * in the nodes list.
       */
      readonly openEdge: Edge|null = null) {}

  /** Constructs a new path from the given edge with an open end. */
  static newPathWithOpenEdge(edge: Edge) {
    // Flip the edge around.
    const startNode = edge.end;
    return new BackwardsPath([startNode], edge);
  }

  /** Constructs a new path from the given edge with a closed end. */
  static newPathWithClosedEdge(edge: Edge) {
    return BackwardsPath.newPathWithOpenEdge(edge).withClosedEnd();
  }

  /** Returns a copy of the current path, with an open edge added to the end of it. Fails if the path already has an open edge. */
  withNewOpenEdge(edge: Edge): BackwardsPath {
    // Flip the edge around.
    const startNode = edge.end;
    const endNode = edge.start;

    assert(!this.openEdge, 'Path already ends with an open edge.');
    assert(startNode === this.end, 'Edge must connect to end of path.');

    if (this.nodes.includes(endNode)) {
      throw new Error('Graph must not include cycles.');
    }

    return new BackwardsPath(this.nodes, edge);
  }

  /** Returns a copy of the current path, converting an open edge to a closed one. Fails if the path does not have an open edge. */
  withClosedEnd(): BackwardsPath {
    assert(!!this.openEdge, 'Path is already closed.');

    // Flip edge around.
    const endNode = this.openEdge.start;
    return new BackwardsPath([...this.nodes, endNode]);
  }

  withNewClosedEdge(edge: Edge): BackwardsPath {
    return this.withNewOpenEdge(edge).withClosedEnd();
  }

  get startNode(): Node {
    return this.nodes[0];
  }

  get end(): Node | Edge {
    return this.openEdge || this.nodes[this.nodes.length - 1];
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

interface CheckEvaluator {
  /** Evaluates the given check condition. */
  evaluateCheck(check: string, path: BackwardsPath): CheckResult;
}

export abstract class Node implements CheckEvaluator {
  abstract readonly inEdges: Edge[];
  abstract readonly outEdges: Edge[];

  evaluateCheck(check: string, path: BackwardsPath): CheckResult {
    if (this.inEdges.length === 0) {
      // Nodes without inputs are untagged, and so cannot satisfy checks.
      // TODO: Improve error message by including the name of the untagged node (the problem is not all nodes actually have names...)
      return {type: CheckResultType.Failure, reason: `Check '${check}' failed: found untagged node.`};
    }
    // Nodes can't have claims themselves (yet). Keep going, and check the in-edges next.
    const checkNext = this.inEdges.map(e => path.withNewOpenEdge(e));
    return {type: CheckResultType.KeepGoing, checkNext};
  }

  get inNodes(): Node[] {
    return this.inEdges.map(e => e.start);
  }

  get outNodes(): Node[] {
    return this.outEdges.map(e => e.end);
  }
}

export interface Edge extends CheckEvaluator {
  readonly start: Node;
  readonly end: Node;
  readonly label: string;
  readonly claim?: string;
  readonly check?: string;
}

class ParticleNode extends Node {
  readonly inEdges: ParticleInput[] = [];
  readonly outEdges: ParticleOutput[] = [];
  readonly name: string;

  // Maps from handle names to tags.
  readonly claims: Map<string, string>;
  readonly checks: Map<string, string>;

  constructor(particle: Particle) {
    super();
    this.name = particle.name;
    this.claims = particle.spec.trustClaims;
    this.checks = particle.spec.trustChecks;
  }
}

class ParticleInput implements Edge {
  readonly start: Node;
  readonly end: ParticleNode;
  readonly label: string;

  /* Optional check on this input. */
  readonly check?: string;

  constructor(particleNode: ParticleNode, otherEnd: Node, inputName: string) {
    this.start = otherEnd;
    this.end = particleNode;
    this.label = `${particleNode.name}.${inputName}`;
    this.check = particleNode.checks.get(inputName);
  }

  evaluateCheck(check: string, path: BackwardsPath): CheckResult {
    // In-edges don't have claims. Keep checking.
    return {type: CheckResultType.KeepGoing, checkNext: [path.withClosedEnd()]};
  }
}

class ParticleOutput implements Edge {
  readonly start: ParticleNode;
  readonly end: Node;
  readonly label: string;

  /* Optional claim on this output. */
  readonly claim?: string;

  constructor(particleNode: ParticleNode, otherEnd: Node, outputName: string) {
    this.start = particleNode;
    this.end = otherEnd;
    this.label = `${particleNode.name}.${outputName}`;
    this.claim = particleNode.claims.get(outputName);
  }

  evaluateCheck(check: string, path: BackwardsPath): CheckResult {
    if (!this.claim) {
      // This out-edge has no claims. Keep checking.
      return {type: CheckResultType.KeepGoing, checkNext: [path.withClosedEnd()]};
    }
    if (this.claim === check) {
      return {type: CheckResultType.Success};
    }
    // The claim on this edge "clobbers" any claims that might have been made upstream. We won't check though, and will fail the check
    // completely.
    return {type: CheckResultType.Failure, reason: `Check '${check}' failed: found claim '${this.claim}' on '${this.label}' instead.`};
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
}
