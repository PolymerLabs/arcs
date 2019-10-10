/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import {Schema} from '../runtime/schema.js';
import {Manifest} from '../runtime/manifest.js';
import {Dictionary} from '../runtime/hot.js';
import {Utils} from '../../shells/lib/utils.js';
import {HandleConnectionSpec, ParticleSpec} from '../runtime/particle-spec.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';

export interface EntityData {
  name: string;
  schema: Schema;
}

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

class TypeGraph implements TypeLattice {
  edges: Dictionary<string[]>;
  nodes: Dictionary<FieldEntry>;
  nodesByParticle: Dictionary<FieldEntry[]>;

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

  // tslint:disable-next-line:variable-name
  public static Builder = class Builder {
    manifestData: Iterable<FieldEntry> = null;

    public from(manifest: Manifest): Builder {
      this.manifestData =  this.parse(manifest);
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
  };
}


export abstract class Schema2Base {
  constructor(readonly opts: minimist.ParsedArgs) {
    Utils.init('../..');
  }

  async call() {
    fs.mkdirSync(this.opts.outdir, {recursive: true});
    for (const file of this.opts._) {
      if (fs.existsSync(file)) {
        await this.processFile(file);
      } else {
        throw new Error(`File not found: ${file}`);
      }
    }
  }

  private async processFile(src: string) {
    const outName = this.opts.outfile || this.outputName(path.basename(src));
    const outPath = path.join(this.opts.outdir, outName);
    console.log(outPath);
    if (this.opts.update && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs > fs.statSync(src).mtimeMs) {
      return;
    }

    const manifest = await Utils.parse(`import '${src}'`);
    const schemas = Schema2Base.collectSchemas(manifest);

    if (Object.keys(schemas).length === 0) {
      console.warn(`No schemas found in '${src}'`);
      return;
    }

    const inlineSchemas = this.collectInlineSchemas(schemas);

    const graph: TypeLattice = new TypeGraph.Builder()
      .from(manifest)
      .build();

    const outFile = fs.openSync(outPath, 'w');
    fs.writeSync(outFile, this.fileHeader(outName));
    for (const dict of [inlineSchemas, schemas]) {
      for (const [name, schema] of Object.entries(dict)) {
        fs.writeSync(outFile, this.entityClass({name, schema}).replace(/ +\n/g, '\n'));
      }
    }
    fs.writeSync(outFile, this.fileFooter());
    fs.closeSync(outFile);
  }




  /**
   * Collect inline schema fields. These will be output first so they're defined
   * prior to use in their containing entity classes.
   * @param schemas
   */
  private collectInlineSchemas(schemas: Dictionary<Schema>): Dictionary<Schema> {
    const inlineSchemas: Dictionary<Schema> = {};
    for (const schema of Object.values(schemas)) {
      for (const [field, descriptor] of Object.entries(schema.fields)) {
        if (descriptor.kind === 'schema-reference' && descriptor.schema.kind === 'schema-inline') {
          const name = Schema2Base.inlineSchemaName(field, descriptor);
          if (!(name in inlineSchemas)) {
            inlineSchemas[name] = descriptor.schema.model.getEntitySchema();
          }
        }
      }
    }
    return inlineSchemas;
  }

  /**
   * Collects schemas from the manifest.
   *
   * Includes schemas that have no names (anonymous) or schemas with multiple aliases
   *
   * @param manifest Manifest expended by loader.
   * @return Dictionary<Schema> target schemas for code generation.
   */
  public static collectSchemas(manifest: Manifest): Dictionary<Schema> {
    /** Helper function: produce a new name for a schema found in the manifest. */
    const mangleDuplicateName = <T>(collection: Dictionary<T>, name: string): string => {
      let candidate = name;
      while (candidate in collection) candidate += '_';
      return candidate;
    };

    /** Helper function: Schema is unique if it has a unique name or a unique set of fields. */
    const isUniqueSchema = (collection: Dictionary<Schema>, candidate: Schema, name: string): boolean => {
      return !(name in collection) && !Object.values(collection).some((val) => candidate.equals(val));
    };

    /** Helper function: Include a schema in the final set if it: (is an alias OR is anonymous) AND is a unique schema */
    const combineWithNewName = (acc: Dictionary<Schema>, schema: Schema) => (name: string) => {
      const tmpName = name || Schema2Base.nameAnonymousSchema(schema);
      if (isUniqueSchema(acc, schema, tmpName)) {
        const newName = mangleDuplicateName(acc, tmpName);
        acc[newName] = schema;
      }
    };

    const schemas: Dictionary<Schema> = {};

    manifest.allParticles
      .map((particle: ParticleSpec): HandleConnectionSpec[] => particle.connections)
      .reduce((acc, val) => acc.concat(val), [])  // equivalent to .flat()
      .forEach((connection: HandleConnectionSpec) => {
        const schema: Schema = connection.type.getEntitySchema();
        if (schema) {
          schema.names.forEach(combineWithNewName(schemas, schema));
        }
      });

    return schemas;
  }

  // TODO(alxr) Would like to discuss with someone more knowledge than I about what
  //  schemas are collected by manifest.allSchemas
  private static nameAnonymousSchema(schema: Schema): string {
    return ['Anon',
      ...Object.values(schema.fields)
        .filter(field => field.kind === 'schema-primitive')
        .map((field): string => field.type)
        .sort((a: string, b: string) => a.localeCompare(b))
    ].join('_');
  }

  protected processSchema(schema: Schema,
                          processField: (field: string, typeChar: string, refName: string) => void): number {
    let fieldCount = 0;
    for (const [field, descriptor] of Object.entries(schema.fields)) {
      fieldCount++;
      switch (this.typeSummary(descriptor)) {
        case 'schema-primitive:Text':
          processField(field, 'T', null);
          break;

        case 'schema-primitive:URL':
          processField(field, 'U', null);
          break;

        case 'schema-primitive:Number':
          processField(field, 'N', null);
          break;

        case 'schema-primitive:Boolean':
          processField(field, 'B', null);
          break;

        case 'schema-reference':
          processField(field, 'R', Schema2Base.inlineSchemaName(field, descriptor));
          break;

        default:
          console.log(`Schema type for field '${field}' is not yet supported:`);
          console.dir(descriptor, {depth: null});
          process.exit(1);
      }
    }
    return fieldCount;
  }

  private typeSummary(descriptor) {
    switch (descriptor.kind) {
      case 'schema-primitive':
        return `schema-primitive:${descriptor.type}`;

      case 'schema-collection':
        return `schema-collection:${descriptor.schema.type}`;

      default:
        return descriptor.kind;
    }
  }

  private static inlineSchemaName(field, descriptor) {
    let name = descriptor.schema.name;
    if (!name && descriptor.schema.names && descriptor.schema.names.length > 0) {
      name = descriptor.schema.names[0];
    }
    if (!name) {
      console.log(`Unnamed inline schemas (field '${field}') are not yet supported`);
      process.exit(1);
    }
    return name;
  }

  abstract outputName(baseName: string): string;

  abstract fileHeader(outName: string): string;

  abstract fileFooter(): string;

  abstract entityClass(data: EntityData): string;
}
