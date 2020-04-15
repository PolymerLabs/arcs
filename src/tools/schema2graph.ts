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
import {ParticleSpec} from '../runtime/particle-spec.js';
import {upperFirst} from './kotlin-generation-utils.js';
import {AtLeastAsSpecific} from '../runtime/refiner.js';
import {connect} from 'http2';

export class SchemaNode {
  schema: Schema;

  // If this schema is only found once, name is of the form 'Particle_Handle' and aliases
  // is empty. Otherwise, name is of the form 'ParticleInternal#' and aliases lists the
  // 'Particle_Handle' names that need to be type aliased to it.
  name: string;
  aliases: string[] = [];
  particleName: string;
  connections: string[] =[];

  // All schemas that can be sliced to this one.
  descendants = new Set<SchemaNode>();

  // Immediate descendants and ancestors. Initially null as state indicators during the two
  // build phases, but will be set to empty arrays if no parents or children are present.
  parents: SchemaNode[] = null;
  children: SchemaNode[] = null;

  // Maps reference fields to the node for their contained schema. This is also used to
  // ensure that nested schemas are generated before the references that rely on them.
  refs = new Map<string, SchemaNode>();

  constructor(schema: Schema, particleName: string, connectionName: string) {
    this.schema = schema;
    this.connections.push(connectionName);
    this.particleName = particleName;
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
  internalClassIndex = 0;
  nameGenerator: (node: SchemaNode, i: number)  => string;
  aliasGenerator: (node: SchemaNode) => string[];

  constructor(
    readonly particleSpec: ParticleSpec,
    nameGenerator: (node: SchemaNode, i: number)  => string,
    aliasGenerator: (node: SchemaNode)  => string[]
    ) {
    this.nameGenerator = nameGenerator;
    this.aliasGenerator = aliasGenerator;
    // First pass to establish a node for each unique schema, with the descendants field populated.
    for (const connection of this.particleSpec.connections) {
      const schema = connection.type.getEntitySchema();
      if (schema) {
        console.log(`Particle Name ${particleSpec.name}`);
        console.log(`conneciton name ${connection.name}`);
        this.createNodes(schema, this.particleSpec.name, upperFirst(connection.name));
      }
    }

    // Both the second pass and the walk() method need to start from nodes with no parents.
    this.startNodes = this.nodes.filter(n => !n.parents);

    // Second pass to set up the class names, aliases, parents and children.
    for (const node of this.startNodes) {
      node.parents = [];
      this.process(node);
    }
  }

  private createNodes(schema: Schema, particleName: string, connectionName: string) {
    let node = this.nodes.find(n => schema.equals(n.schema));
    if (node) {
      // We can only have one node in the graph per schema. Collect duplicates as aliases.
      if (!node.connections.includes(connectionName)) {
        node.connections.push(connectionName);
      }
    } else {
      // This is a new schema. Check for slicability against all previous schemas
      // (in both directions) to establish the descendancy mappings.
      node = new SchemaNode(schema, particleName, connectionName);
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
        console.log(`nest name: ${particleName}`);
        console.log(`nest field ${field}`);
        const nestedNode = this.createNodes(nestedSchema, particleName, `${upperFirst(connectionName)}_${upperFirst(field)}`);
        node.refs.set(field, nestedNode);
      }
    }
    return node;
  }

  private process(node: SchemaNode) {
    if (node.children) return;  // already visited

    // If this node only has one alias, use that for the class name.
    // Otherwise generate an internal name and create aliases for it.
    if (node.connections.length === 1) {
      node.name = this.nameGenerator(node, -1);
      node.aliases = this.aliasGenerator(node);
    } else {
      node.name = this.nameGenerator(node, ++this.internalClassIndex);//`${this.particleSpec.name}Internal${++this.internalClassIndex}`;
      node.aliases = this.aliasGenerator(node);
    }

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
