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
import {ParticleSpec, HandleConnectionSpec} from '../runtime/particle-spec.js';
import {upperFirst} from './kotlin-generation-utils.js';
import {AtLeastAsSpecific} from '../runtime/refiner.js';

// Describes a source from where the Schema has been collected.
export class SchemaSource {
  constructor(
    readonly particleSpec: ParticleSpec,
    readonly connection: HandleConnectionSpec,
    // Path consisting of field names describing where the schema was found.
    //
    // Example for a schema Address:
    // Type: [Address]                                       Path: []
    // Type: Person {home: &Place {address: &Address {}}}   Path: ['home', 'address']
    readonly path: string[]
  ) {}

  child(leaf: string) {
    return new SchemaSource(this.particleSpec, this.connection, [...this.path, leaf]);
  }

  // Full name is used to described this particular occurence of the schema.
  get fullName() {
    return `${this.particleSpec.name}_${upperFirst(this.connection.name)}` +
       this.path.map(p => `_${upperFirst(p)}`).join('');
  }
}

export class SchemaNode {
  constructor(
    readonly schema: Schema,
    readonly particleSpec: ParticleSpec,
    readonly allSchemaNodes: SchemaNode[]
  ) {}

  readonly sources: SchemaSource[] = [];

  // All schemas that can be sliced to this one.
  descendants = new Set<SchemaNode>();

  // Immediate descendants and ancestors. Initially null as state indicators during the two
  // build phases, but will be set to empty arrays if no parents or children are present.
  parents: SchemaNode[] = null;
  children: SchemaNode[] = null;

  // Maps reference fields to the node for their contained schema. This is also used to
  // ensure that nested schemas are generated before the references that rely on them.
  refs = new Map<string, SchemaNode>();

  get entityClassName() {
    if (this.sources.length === 1) {
      // If there is just one occurence, use its full name.
      return this.sources[0].fullName;
    }
    // If there are multiple occurences use a generated name to which we will generate aliases.
    const index = this.allSchemaNodes.filter(n => n.sources.length > 1).indexOf(this) + 1;
    return `${this.particleSpec.name}Internal${index}`;
  }

  // This will return the most "developer friendly" name for the entity type. If the name is of the form
  // Internal$N, we will use the full name from the source. Otherwise, we will use the name of the node.
  // Note: Right now this will always return sournce.fullName, but it is a stepping stone towards renaming
  // the entities. This will change once we enable handle connections with tuples.
  static devFriendlyEntityTypeForConnection(connection: HandleConnectionSpec, nodes: SchemaNode[]): string {
    const source = SchemaNode.getSourceForConnection(connection, nodes);
    const node = nodes.find(n => n.sources.includes(source));
    if (node.sources.length === 1) {
      return node.entityClassName;
    } else {
      return source.fullName;
    }
  }

  static getSourceForConnection(connection: HandleConnectionSpec, nodes: SchemaNode[]) : SchemaSource {
    const allSources = nodes.map(n => n.sources).reduce((curr, acc) => [...acc, ...curr], []);
    return allSources.find(s => s.connection === connection && s.path.length === 0);
  }
}

// Builds a directed type lattice graph from the set of schemas defined in a particle's connections,
// including schemas nested in references, with one node per unique schema found. The graph's edges
// indicate "slicability", such that a child node's schema can be sliced to any of its parents.
// For example, the schema '* {Text t, URL u}' is slicable to both '* {Text t}' and '* {URL u}'.
//
// The graph has a second set of edges via the refs field, which connects nodes whose schemas have
// references to other nodes which hold those references' nested schemas. These are used to ensure
// classes are generated in the order needed to satisfy their reference field type definitions.
export class SchemaGraph {
  nodes: SchemaNode[] = [];
  startNodes: SchemaNode[];

  constructor(readonly particleSpec: ParticleSpec) {
    // First pass to establish a node for each unique schema, with the descendants field populated.
    for (const connection of this.particleSpec.connections) {
      const source = new SchemaSource(this.particleSpec, connection, []);
      this.createNodes(connection.type.getEntitySchema(), this.particleSpec, source);
    }

    // Both the second pass and the walk() method need to start from nodes with no parents.
    this.startNodes = this.nodes.filter(n => !n.parents);

    // Second pass to set up the class names, aliases, parents and children.
    for (const node of this.startNodes) {
      node.parents = [];
      this.process(node);
    }
  }

  private createNodes(schema: Schema, particleSpec: ParticleSpec, source: SchemaSource) {
    let node = this.nodes.find(n => schema.equals(n.schema));
    if (node) {
      node.sources.push(source);
    } else {
      // This is a new schema. Check for slicability against all previous schemas
      // (in both directions) to establish the descendancy mappings.
      node = new SchemaNode(schema, particleSpec, this.nodes);
      node.sources.push(source);
      for (const previous of this.nodes) {
        for (const [a, b] of [[node, previous], [previous, node]]) {
          if (b.schema.isEquivalentOrMoreSpecific(a.schema) === AtLeastAsSpecific.YES) {
            if (b.descendants.has(a)) {
              throw new Error(`Cannot add ${b} to ${a}.descendants as it would create a cycle.`);
            }
            a.descendants.add(b);  // b can be sliced to a
            b.parents = [];        // non-null to indicate this has parents; will be filled later
          }
        }
      }

      this.nodes.push(node);
    }

    // Recurse on any nested schemas in reference-typed fields. We need to do this even if we've
    // seen this schema before, to ensure any nested schemas end up aliased appropriately.
    for (const [field, descriptor] of Object.entries(schema.fields)) {
      let nestedSchema: Schema | undefined;
      if (descriptor.kind === 'schema-reference') {
        nestedSchema = descriptor.schema.model.entitySchema;
      } else if (descriptor.kind === 'schema-collection' && descriptor.schema.kind === 'schema-reference') {
        nestedSchema = descriptor.schema.schema.model.entitySchema;
      }
      if (nestedSchema) {
        // We have a reference field. Generate a node for its nested schema and connect it into the
        // refs map to indicate that this node requires nestedNode's class to be generated first.
        const nestedNode = this.createNodes(nestedSchema, particleSpec, source.child(field));
        node.refs.set(field, nestedNode);
      }
    }
    return node;
  }

  private process(node: SchemaNode) {
    if (node.children) return;  // already visited

    // Set up children links: collect descendants of descendants.
    const transitiveDescendants = new Set<SchemaNode>();
    for (const d of node.descendants) {
      for (const td of d.descendants) {
        transitiveDescendants.add(td);
      }
    }

    // children = (all descendants) - (descendants of descendants)
    node.children = [...node.descendants].filter(x => !transitiveDescendants.has(x));

    // Set up parent links on child nodes.
    for (const child of node.children) {
      child.parents.push(node);
      this.process(child);
    }
  }

  // Traverses the graph to yield schemas in the order in which they should be generated.
  // The traversal is primarily breadth-first, but some nodes may be pushed back due to
  // unsatisfied constraints.
  * walk(): IterableIterator<SchemaNode> {
    const queue: SchemaNode[] = [...this.startNodes];
    const seen = new Set<SchemaNode>();
    while (queue.length > 0) {
      const node = queue.shift();
      if (seen.has(node)) {
        continue;
      }

      // We can only process this node if all its parents and reference fields have
      // themselves been processed. If not, push it to the back of the queue.
      if (node.parents.some(p => !seen.has(p)) ||
          [...node.refs.values()].some(r => !seen.has(r))) {
        queue.push(node);
        continue;
      }

      queue.push(...node.children);
      seen.add(node);
      yield node;
    }
  }
}
