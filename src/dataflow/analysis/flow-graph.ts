/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe} from '../../runtime/recipe/recipe';
import {Particle} from '../../runtime/recipe/particle';
import {Handle} from '../../runtime/recipe/handle';
import {HandleConnection} from '../../runtime/recipe/handle-connection';
import {assert} from '../../platform/assert-web';
import {ClaimType, ClaimIsTag, ClaimDerivesFrom, Claim} from '../../runtime/particle-claim';
import {Check, CheckType, CheckCondition, CheckHasTag, CheckIsFromHandle} from '../../runtime/particle-check';
import {HandleConnectionSpec} from '../../runtime/particle-spec';

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

  /** 
   * Validates a single check (on the given edge). We define validation as
   * every path ending at the edge must pass the check on that edge. 
   * Returns true if the check passes.
   */
  private validateSingleEdge(edgeToCheck: Edge): ValidationResult {
    assert(!!edgeToCheck.check, 'Edge does not have any check conditions.');

    const check = edgeToCheck.check;
    const conditions = checkToList(check);

    const finalResult = new ValidationResult();

    // Check every input path into the given edge.
    // NOTE: This is very inefficient. We check every single check condition against every single edge in every single input path.
    for (const path of allInputPaths(edgeToCheck)) {
      const claimsForPath = computeTagClaimsInPath(path);
      const handlesInPath = computeHandlesInPath(path);
      if (!evaluateCheck(conditions, claimsForPath, handlesInPath)) {
        finalResult.failures.push(path.checkFailureString(`'${check.toManifestString()}'`));
      }
    }

    return finalResult;
  }
}

/**
 * Preprocess a check into a list of conditions. This will need to change when
 * we implement complex boolean expressions.
 */
function checkToList(check: Check): CheckCondition[] {
 // TODO: Support boolean expression trees properly! Currently we only deal with a single string of OR'd conditions.
  const conditions: CheckCondition[] = [];
  switch (check.expression.type) {
    case 'and':
      throw new Error(`Boolean expressions with 'and' are not supported yet.`);
    case 'or':
      for (const child of check.expression.children) {
        assert(child.type !== 'or' && child.type !== 'and', 'Nested boolean expressions are not supported yet.');
        conditions.push(child as CheckCondition);
      }
      break;
    default:
      // Expression is just a single condition.
      conditions.push(check.expression);
      break;
  }
  return conditions;
}

/**
 * Iterates through every path in the graph that lead into the given edge. Each
 * path returned is a BackwardsPath, beginning at the given edge, and ending at
 * the end of a path in the graph (i.e. a node with no input edges). "derives 
 * from" claims are used to prune paths, but the claims themselves are not
 * removed from the path edges.
 */
function* allInputPaths(startEdge: Edge): Iterable<BackwardsPath> {
  const startPath = BackwardsPath.fromEdge(startEdge);
  // Stack of partial paths that need to be expanded (via DFS). Other paths will be added here to be expanded as we explore the graph.
  const pathStack: BackwardsPath[] = [startPath];

  while (pathStack.length) {
    const path = pathStack.pop();
    const inEdges = path.endNode.inEdgesFromOutEdge(path.endEdge);
    if (inEdges.length === 0) {
      // Path is finished, yield it.
      yield path;
    } else {
      // Path is not finished, continue extending it via all in-edges.
      for (const nextEdge of inEdges) {
        pathStack.push(path.withNewEdge(nextEdge));
      }
    }
  }
}

/**
 * Collects all the tag claims along the given path, canceling tag claims that are
 * negated by "not" claims for the same tag downstream in the path, and ignoring
 * "not" claims without corresponding positive claims upstream, as these dangling
 * "not" claims are irrelevant for the given path. Note that "derives from" claims
 * only prune paths, and are dealt with during path generation, so they are ignored.
 */
function computeTagClaimsInPath(path: BackwardsPath): ClaimIsTag[] {
  const claims: ClaimIsTag[] = [];
  // We traverse the path in the forward direction, so we can cancel correctly.
  const edgesInPath = path.edges.slice().reverse();
  edgesInPath.forEach(e => {
    if (!e.claim) {
      return;
    }
    if (e.claim.type === ClaimType.DerivesFrom) {
      return;
    } 
    const tagClaim = e.claim as ClaimIsTag;
    if (!tagClaim.isNot) {
      claims.push(tagClaim);
      return;          
    }
    // Our current claim is a "not" tag claim. 
    // Ignore it if there are no preceding tag claims
    if (claims.length === 0) {
      return;
    }
    // Find and remove all existing positive claims for the tag. There may be > 1.
    let index = 0;
    while (index < claims.length) {
      const priorClaim = claims[index];
      if (priorClaim.tag == tagClaim.tag) {
        claims.splice(index, 1);
      } else {
        index += 1;
      }
    }
  });
  return claims;
}

/**
 * Collects and returns the names of all the handles in this path. 
 */
function computeHandlesInPath(path: BackwardsPath): HandleNode[] {
  const handles: HandleNode[] = [];
  for (const node of path.nodes) {
    if (node instanceof HandleNode) {
      handles.push(node);
    }
  }
  return handles;
}

/** 
 * Returns true if the given check passes against one of the tag claims or one
 * one of the handles in the path. Only one condition needs to pass.
 */
function evaluateCheck(conditions: CheckCondition[], 
                       claims: ClaimIsTag[],
                       handles: HandleNode[]): boolean {
  // Check every condition against the set of tag claims. If it fails, check
  // against the handles
  for (const condition of conditions) {
    if (condition.type === CheckType.HasTag) {
      for (const claim of claims) {
        const tagMatches = (claim.tag === (condition as CheckHasTag).tag);
        // If the claim has a 'not', invert the match, i.e. if the tag
        // matches, the result is false and if it doesn't the result is true.
        const result = claim.isNot ? !tagMatches : tagMatches;
        // Only one condition needs to pass against any claim, so if we pass we 
        // can return true straight away.
        if (result === true) {
          return true;
        }
      }
    } else { // condition type is from handle
      for (const handle of handles) {
        // Again, only one condition needs to pass.
        const checkHandle = (condition as CheckIsFromHandle).parentHandle;
        if (handle.outConnectionSpecs.has(checkHandle)) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Result from validating an entire graph. */
export class ValidationResult {
  failures: string[] = [];
  
  get isValid() {
    return this.failures.length === 0;
  }
}

/**
 * A path that walks backwards through the graph, i.e. it walks along the 
 * directed edges in the reverse direction. The path is described by the
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

  checkFailureString(check: string) : string {
    const edgesInPath = this.edges.slice().reverse();
    const pathString = edgesInPath.map(e => e.label).join(' -> ');
    return (`${check} failed for path: ${pathString}`);
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
      const edge = new ParticleInput(particleNode, handleNode, connection);
      particleNode.addInEdge(edge);
      handleNode.addOutEdge(edge);
      return edge;
    }
    case 'out': {
      const edge = new ParticleOutput(particleNode, handleNode, connection);
      particleNode.addOutEdge(edge);
      handleNode.addInEdge(edge);
      return edge;
    }
    case 'inout': // TODO: Handle inout directions.
    case 'host':
    default:
      throw new Error(`Unsupported connection type: ${connection.direction}`);
  }
}


export abstract class Node {
  abstract readonly inEdges: readonly Edge[];
  abstract readonly outEdges: readonly Edge[];

  abstract addInEdge(edge: Edge): void;
  abstract addOutEdge(edge: Edge): void;

  get inNodes(): Node[] {
    return this.inEdges.map(e => e.start);
  }

  get outNodes(): Node[] {
    return this.outEdges.map(e => e.end);
  }

  abstract inEdgesFromOutEdge(outEdge: Edge): readonly Edge[];
}

export interface Edge {
  readonly start: Node;
  readonly end: Node;
  
  /** The name of the handle this edge represents, e.g. "output1". */
  readonly handleName: string;
  
  /** The qualified name of the handle this edge represents, e.g. "MyParticle.output1". */
  readonly label: string;

  readonly claim?: Claim;
  readonly check?: Check;
}

class ParticleNode extends Node {
  readonly inEdgesByName: Map<string, ParticleInput> = new Map();
  readonly outEdgesByName: Map<string, ParticleOutput> = new Map();

  readonly name: string;

  // Maps from handle names to tags.
  readonly claims: Map<string, Claim>;
  readonly checks: Map<string, Check>;

  constructor(particle: Particle) {
    super();
    this.name = particle.name;
    this.claims = particle.spec.trustClaims;
    this.checks = particle.spec.trustChecks;
  }
    
  addInEdge(edge: ParticleInput) {
    this.inEdgesByName.set(edge.handleName, edge);
  }
  
  addOutEdge(edge: ParticleOutput) {
    this.outEdgesByName.set(edge.handleName, edge);
  }
  
  get inEdges(): readonly ParticleInput[] {
    return [...this.inEdgesByName.values()];
  }

  get outEdges(): readonly ParticleOutput[] {
    return [...this.outEdgesByName.values()];
  }

  /**
   * Iterates through all of the relevant in-edges leading into this particle, that flow out into the given out-edge. The out-edge may have a
   * 'derives from' claim that restricts which edges flow into it.
   */
  inEdgesFromOutEdge(outEdge: ParticleOutput): readonly ParticleInput[] {
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

class ParticleInput implements Edge {
  readonly start: Node;
  readonly end: ParticleNode;
  readonly label: string;
  readonly handleName: string;
  readonly connectionSpec: HandleConnectionSpec;

  /* Optional check on this input. */
  readonly check?: Check;

  constructor(particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.start = otherEnd;
    this.end = particleNode;
    this.handleName = connection.name;
    this.label = `${particleNode.name}.${this.handleName}`;
    this.check = particleNode.checks.get(this.handleName);
    this.connectionSpec = connection.spec;
  }
}

class ParticleOutput implements Edge {
  readonly start: ParticleNode;
  readonly end: Node;
  readonly label: string;
  readonly handleName: string;
  readonly connectionSpec: HandleConnectionSpec;

  /* Optional claim on this output. */
  readonly claim?: Claim;

  constructor(particleNode: ParticleNode, otherEnd: Node, connection: HandleConnection) {
    this.start = particleNode;
    this.end = otherEnd;
    this.handleName = connection.name;
    this.label = `${particleNode.name}.${this.handleName}`;
    this.claim = particleNode.claims.get(this.handleName);
    this.connectionSpec = connection.spec;
  }
}

class HandleNode extends Node {
  readonly inEdges: ParticleOutput[] = [];
  readonly outEdges: ParticleInput[] = [];
  readonly outConnectionSpecs: Set<HandleConnectionSpec> = new Set();

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

  addInEdge(edge: ParticleOutput) {
    this.inEdges.push(edge);
  }

  addOutEdge(edge: ParticleInput) {
    this.outEdges.push(edge);
    this.outConnectionSpecs.add(edge.connectionSpec);
  }

  inEdgesFromOutEdge(outEdge: ParticleInput): readonly ParticleOutput[] {
    return this.inEdges;
  }
}
