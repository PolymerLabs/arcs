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
}

class Builder {
  manifestData: Iterable<FieldEntry> = null;

  public from(manifest: Manifest): Builder {
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
      graph.addNode(entry);
    }
    for (const particleEntries of Object.values(graph.nodesByParticle)) {
      for (const e0 of particleEntries) {
        for (const e1 of particleEntries) {
          if (!isHandleDirection(e0) || !isHandleDirection(e1)) {
            continue;
          }
          const source = graph.makeName(e0);
          const name = graph.makeName(e1);
          if (source !== name && e0.schema.isMoreSpecificThan(e1.schema)) {
            graph.addEdge(source, name);
          }
        }
      }
    }
  }
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

  public makeName(entry: FieldEntry): string {
    return `${entry.particleName}_${entry.connectionName}`;
  }

  public addNode(entry: FieldEntry) {
    const name = this.makeName(entry);
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

