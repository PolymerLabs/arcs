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
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {SchemaGraph, SchemaNode} from './schema2graph.js';
import {ParticleSpec} from '../runtime/particle-spec.js';

export type AddFieldOptions = Readonly<{
  field: string;
  typeName: string;
  isOptional?: boolean;
  refClassName?: string;
  refSchemaHash?: string;
  listTypeInfo?: {name: string, refSchemaHash?: string, isInlineClass?: boolean};
  isCollection?: boolean;
  isInlineClass?: boolean;
}>;

export interface EntityGenerator {
  generate(): string;
}

export class NodeAndGenerator {
  node: SchemaNode;
  generator: EntityGenerator;
}

/**
 * Iterates over schema fields and composes metadata useful for entity codegen.
 */
export abstract class SchemaDescriptorBase {

  constructor(readonly node: SchemaNode) {}

  process() {
    for (const [field, descriptor] of Object.entries(this.node.schema.fields)) {
      if (descriptor.kind === 'schema-primitive') {
        if (['Text', 'URL', 'Number', 'Boolean'].includes(descriptor.type)) {
          this.addField({field, typeName: descriptor.type});
        } else {
          throw new Error(`Schema type '${descriptor.type}' for field '${field}' is not supported`);
        }
      } else if (descriptor.kind === 'schema-reference' || (descriptor.kind === 'schema-collection' && descriptor.schema.kind === 'schema-reference')) {
        const isCollection = descriptor.kind === 'schema-collection';
        const schemaNode = this.node.refs.get(field);
        this.addField({
          field,
          typeName: 'Reference',
          isCollection,
          refClassName: schemaNode.entityClassName,
          refSchemaHash: schemaNode.hash,
        });
      } else if (descriptor.kind === 'schema-collection') {
        const schema = descriptor.schema;
        if (schema.kind === 'kotlin-primitive' || schema.kind === 'schema-primitive') {
          this.addField({field, typeName: schema.type, isCollection: true});
        } else if (schema.kind === 'schema-nested') {
          const schemaNode = this.node.refs.get(field);
          this.addField({field, typeName: schemaNode.entityClassName, refSchemaHash: schemaNode.hash, isCollection: true, isInlineClass: true});
        } else {
          throw new Error(`Schema kind '${schema.kind}' for field '${field}' is not supported`);
        }
      } else if (descriptor.kind === 'kotlin-primitive') {
        this.addField({field, typeName: descriptor.type});
      } else if (descriptor.kind === 'schema-ordered-list') {
        const schema = descriptor.schema;
        if (schema.kind === 'kotlin-primitive' || schema.kind === 'schema-primitive') {
          this.addField({field, typeName: 'List', listTypeInfo: {name: schema.type}});
        } else if (schema.kind === 'schema-nested') {
          const schemaNode = this.node.refs.get(field);
          this.addField({field, typeName: 'List', listTypeInfo: {name: schemaNode.entityClassName, refSchemaHash: schemaNode.hash, isInlineClass: true}});
        } else {
          throw new Error(`Schema kind '${schema.kind}' for field '${field}' is not supported`);
        }
      } else if (descriptor.kind === 'schema-nested') {
        const schemaNode = this.node.refs.get(field);
        this.addField({field, typeName: schemaNode.entityClassName, refSchemaHash: schemaNode.hash, isInlineClass: true});
      }
      else {
        throw new Error(`Schema kind '${descriptor.kind}' for field '${field}' is not supported`);
      }
    }
  }

  abstract addField(opts: AddFieldOptions): void;
}

export abstract class Schema2Base {
  namespace: string;

  constructor(readonly opts: minimist.ParsedArgs) {
    Runtime.init('../..');
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
    if (this.opts.update && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs > fs.statSync(src).mtimeMs) {
      return;
    }

    const manifest = await Runtime.parseFile(src);
    if (manifest.errors.some(e => e.severity !== 'warning')) {
      return;
    }

    this.namespace = manifest.meta.namespace;
    if (!this.namespace) {
      throw new Error(`Namespace is required in '${src}' for code generation.`);
    }

    const classes = await this.processManifest(manifest);
    if (classes.length === 0) {
      console.warn(`Could not find any particle connections with schemas in '${src}'`);
      return;
    }

    const outFile = fs.openSync(outPath, 'w');
    fs.writeSync(outFile, this.fileHeader(outName));
    for (const text of classes) {
      fs.writeSync(outFile, text.replace(/ +\n/g, '\n'));
    }
    fs.writeSync(outFile, this.fileFooter());
    fs.closeSync(outFile);
  }

  async processManifest(manifest: Manifest): Promise<string[]> {
    // TODO: consider an option to generate one file per particle
    const classes: string[] = [];
    for (const particle of manifest.particles) {
      const nodes = await this.calculateNodeAndGenerators(particle);

      classes.push(...nodes.map(ng => ng.generator.generate()));

      if (this.opts.test_harness) {
        classes.push(this.generateTestHarness(particle, nodes.map(n => n.node)));
        continue;
      }

      classes.push(this.generateParticleClass(particle, nodes));
    }
    return classes;
  }

  async calculateNodeAndGenerators(particle: ParticleSpec): Promise<NodeAndGenerator[]> {
    const graph = new SchemaGraph(particle);
    const nodes: NodeAndGenerator[] = [];
    for (const node of graph.walk()) {
      const generator = this.getEntityGenerator(node);
      await node.calculateHash();
      nodes.push({node, generator});
    }

    return nodes;
  }

  upperFirst(s: string): string {
    return s[0].toUpperCase() + s.slice(1);
  }

  outputName(baseName: string): string { return ''; }

  fileHeader(outName: string): string { return ''; }

  fileFooter(): string { return ''; }

  abstract getEntityGenerator(node: SchemaNode): EntityGenerator;

  abstract generateParticleClass(particle: ParticleSpec, nodes: NodeAndGenerator[]): string;

  abstract generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): string;
}
