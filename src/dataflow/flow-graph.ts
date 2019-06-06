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
}

/**
 * A path that walks backwards through the graph, i.e. it walks along the directed edges in the reverse direction. The path is described by the
 * nodes in the path. 
 */
export class BackwardsPath {
  private constructor(readonly nodes: Node[]) {}

  static fromEdge(edge: Edge) {
    return new BackwardsPath([edge.end, edge.start]);
  }

  appendEdge(edge: Edge): BackwardsPath {
    // Flip the edge around.
    const edgeStart = edge.end;
    const edgeEnd = edge.start;

    if (edgeStart !== this.endNode) {
      throw new Error('Edge must connect to end of path.');
    }
    if (this.nodes.includes(edgeEnd)) {
      throw new Error('Path must not include cycles.');
    }
    return new BackwardsPath([...this.nodes, edgeEnd]);
  }

  get startNode(): Node {
    return this.nodes[0];
  }

  get endNode(): Node {
    return this.nodes[this.nodes.length - 1];
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

export abstract class Node {
  abstract readonly inEdges: Edge[];
  abstract readonly outEdges: Edge[];

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
