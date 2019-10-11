/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema} from '../runtime/schema.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';
import {Dictionary} from '../runtime/hot.js';
import {Manifest} from '../runtime/manifest.js';
import {ParticleSpec} from '../runtime/particle-spec.js';

// ------ new stuff ----------

class Node {
  /** name == names[0] or the internal alias if names.length > 1 */
  name: string;

  /**
   * if 1: only instance of this schema, use name directly
   * if >1: dupes exist, generate internal class and create aliases
   */
  names: string[] = [];

  /** all schemas that can be sliced to this one */
  descendants = new Set<Node>();

  /** immediate descendants, will be non-null but empty if no children */
  children: Node[] = null;

  /** inverse of children, will be left null if no parents */
  parents: Node[] = null;

  /** true if any other schema has the same parent as this */
  sharesParent = false;

  /** guards against generating classes twice */
  output = false;

  constructor(readonly schema: Schema, name: string) {
    this.name = name;
    this.names.push(name);
  }
}

function go(manifest) {
  for (const particle of manifest.allParticles) {
    for (const node of buildGraph(particle)) {
      emit(node, particle.name);
    }
  }
}

function buildGraph(particle: ParticleSpec): Node[] {
  const nodes: Node[] = [];

  // first pass to establish nodes for each unique schema, with descendants field populated
  for (const connection of particle.connections) {
    const schema = connection.type.getEntitySchema();
    if (!schema) continue;

    // can only have one node in graph per schema; collect dupes into 'names' for generating aliases
    const alias = nodes.find(n => schema.equals(n.schema));
    if (alias) {
      alias.names.push(connection.name);
      continue;
    }

    // new schema: compare against all previous schemas to check for slicability, in both directions
    const node = new Node(schema, connection.name);
    for (const other of nodes) {
      for (const [a, b] of [[node, other], [other, node]]) {
        if (a.schema.isMoreSpecificThan(b.schema)) {
          b.descendants.add(a);    // a can be sliced to b
          a.parents = [];          // make non-null to indicate there are parents; will be filled later
        }
      }
    }
    nodes.push(node);
  }

  // second pass to set up direct parents/children and sharesParent
  const startNodes = nodes.filter(n => !n.parents).forEach(process);

  if (0) {
    nodes.sort((a, b) => {
      if (a.names[0] < b.names[0]) return -1;
      if (a.names[0] > b.names[0]) return 1;
      return 0;
    });
    console.log();
    const show = a => (a || []).map(x => x.names[0]);
    for (const n of nodes) {
      console.log(n.names, n.sharesParent ? '*' : ' ', show(n.parents), show(n.children));
    }
  }
  return nodes.filter(n => n.children.length === 0);
}

function process(node: Node) {
  if (node.children) return;   // already visited

  // collect all descendants of descendants
  const transitiveDescendants = new Set<Node>();
  for (const d of node.descendants) {
    for (const td of d.descendants) {
      transitiveDescendants.add(td);
    }
  }

  // children = descendants - (desc of desc)
  node.children = [...node.descendants].filter(x => !transitiveDescendants.has(x));

  // attach this as parent to each child, and if this has >1 child they are marked as sharing parent
  for (const child of node.children) {
    child.parents.push(node);
    child.sharesParent = node.children.length > 1;
    process(child);
  }
}

// below this would be part of the language-specific class

let internal = 0;

function emit(node: Node, particleName: string) {
  if (node.output) return;

  for (const p of node.parents || []) {
    emit(p, particleName);
  }

  if (node.names.length === 1) {
    console.log(generate(`${particleName}_${node.names[0]}`, node));
  } else {
    const name = `${particleName}Internal${++internal}`;
    console.log(generate(name, node));
    for (const alias of node.names) {
      console.log(`using ${particleName}_${alias} = ${name};`);
    }
  }
  node.output = true;
}

function generate(name, node) {
  let out = `struct ${name}`;
  if (node.parents && node.parents.length > 0) {
    const spec = (node.sharesParent && node.children.length > 0) ? 'virtual public' : 'public';
    out += ` : ${spec} ` + node.parents.map(x => x.name).join(`, ${spec} `);
  }
  return out + ' {};';
}

// ------ end new stuff ----------

export interface FieldEntry {
  particleName: string;
  schema: Schema;
  direction: Direction;
  connectionName: string;
}

export interface TypeLattice {
  nodes: Dictionary<FieldEntry>;
  edges: Dictionary<string[]>;
  nodesByParticle: Dictionary<FieldEntry[]>;
  contains(name: string): boolean;
}

class Builder {
  manifestData: Iterable<FieldEntry> = null;

  public from(manifest: Manifest): Builder {
    go(manifest);
    this.manifestData = this.parse(manifest);
    return this;
  }

  public to(graph: TypeGraph) {
    if (this.manifestData === null) {
      throw new Error('Call `from` on a manifest first!');
    }
    this.buildGraph(this.manifestData, graph);
  }

  public build(): TypeLattice {
    const graph = new TypeGraph();
    this.to(graph);
    return graph;
  }

  protected* parse(manifest: Manifest): Iterable<FieldEntry> {
    for (const particle of manifest.allParticles) {
      for (const connection of particle.connections) {
        const schema: Schema = connection.type.getEntitySchema();
        if (!schema) {
          continue;
        }
        yield {
          particleName: particle.name,
          schema,
          direction: connection.direction,
          connectionName: connection.name,
        };
      }
    }
  }

  protected buildGraph(entries: Iterable<FieldEntry>, graph: TypeGraph) {
    const allowedDirections = ['in', 'inout', 'out'];
    const isHandleDirection = (e: FieldEntry): boolean => allowedDirections.includes(e.direction);

    for (const entry of entries) {
      if (isHandleDirection(entry)) {
        graph.addNode(entry);
      }
    }
    for (const particleEntries of Object.values(graph.nodesByParticle)) {
      for (const e0 of particleEntries) {
        for (const e1 of particleEntries) {
          if (!isHandleDirection(e0) || !isHandleDirection(e1)) {
            continue;
          }
          const source = nameFromEntry(e0);
          const name = nameFromEntry(e1);
          if (source !== name && e0.schema.isMoreSpecificThan(e1.schema)) {
            graph.addEdge(source, name);
          }
        }
      }
    }
  }
}

export function nameFromEntry(entry: FieldEntry): string {
  return `${entry.particleName}_${entry.connectionName}`;
}

export class TypeGraph implements TypeLattice {
  edges: Dictionary<string[]>;
  nodes: Dictionary<FieldEntry>;
  nodesByParticle: Dictionary<FieldEntry[]>;

  // tslint:disable-next-line:variable-name
  public static Builder = Builder;

  constructor() {
    this.edges = {};
    this.nodes = {};
    this.nodesByParticle = {};
  }

  public addNode(entry: FieldEntry) {
    const name = nameFromEntry(entry);
    if (!this.contains(name)) {
      this.nodes[name] = entry;
      this.edges[name] = [];

      const particleName = entry.particleName;
      if (this.nodesByParticle[particleName] === undefined) {
        this.nodesByParticle[particleName] = [entry];
      } else {
        this.nodesByParticle[particleName].push(entry);
      }
    }
  }

  public contains(name: string): boolean {
    return this.nodes[name] !== undefined;
  }

  public addEdge(source: string, dest: string) {
    if (!this.contains(source)) {
      throw new Error(`${source} must be added to nodes set first!`);
    }
    if (!this.contains(dest)) {
      throw new Error(`${dest} must be added to nodes set first!`);
    }
    // Add edge only once
    if (!(this.edges[source].includes(dest))) {
      this.edges[source].push(dest);
    }
  }
}
