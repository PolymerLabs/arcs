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
import {SchemaGraph, SchemaNode, SchemaSource} from './schema2graph.js';
import {ParticleSpec} from '../runtime/particle-spec.js';

export type AddFieldOptions = Readonly<{
  field: string;
  typeName: string;
  isOptional?: boolean;
  refClassName?: string;
  refSchemaHash?: string;
  listTypeName?: string;
  isCollection?: boolean;
}>;

export interface ClassGenerator {
  addField(opts: AddFieldOptions): void;
  escapeIdentifier(ident: string): string;
  generatePredicates(): void;
  generate(schemaHash: string, fieldCount: number): string;
}

export class NodeAndGenerator {
  node: SchemaNode;
  generator: ClassGenerator;
  hash: string | null;
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

      classes.push(...nodes.map(({generator, node, hash}) => {
        const length = node.schema ? Object.entries(node.schema.fields).length : 0;
        return generator.generate(hash, length);
      }));

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
      const generator = this.getClassGenerator(node);
      if (!node.schema) {
        nodes.push({node, generator, hash: null});
        continue;
      }
      for (const [field, descriptor] of Object.entries(node.schema.fields)) {
        if (descriptor.kind === 'schema-primitive') {
          if (['Text', 'URL', 'Number', 'Boolean'].includes(descriptor.type)) {
            generator.addField({field, typeName: descriptor.type});
          } else {
            throw new Error(`Schema type '${descriptor.type}' for field '${field}' is not supported`);
          }
        } else if (descriptor.kind === 'schema-reference' || (descriptor.kind === 'schema-collection' && descriptor.schema.kind === 'schema-reference')) {
          const isCollection = descriptor.kind === 'schema-collection';
          const schemaNode = node.refs.get(field);
          generator.addField({
            field,
            typeName: 'Reference',
            isCollection,
            refClassName: schemaNode.entityClassName,
            refSchemaHash: await schemaNode.schema.hash(),
          });
        } else if (descriptor.kind === 'schema-collection') {
          const schema = descriptor.schema;
           if (!((schema.kind === 'kotlin-primitive') || ['Text', 'URL', 'Number', 'Boolean'].includes(schema.type))) {
            throw new Error(`Schema type '${schema.type}' for field '${field}' is not supported`);
          }
          generator.addField({field, typeName: schema.type, isCollection: true});
        } else if (descriptor.kind === 'kotlin-primitive') {
          generator.addField({field, typeName: descriptor.type});
        } else if (descriptor.kind === 'schema-ordered-list') {
          generator.addField({field, typeName: 'List', listTypeName: descriptor.schema.type});
        }
        else {
          throw new Error(`Schema kind '${descriptor.kind}' for field '${field}' is not supported`);
        }
      }
      if (node.schema.refinement) {
        generator.generatePredicates();
      }
      const hash = await node.schema.hash();
      nodes.push({node, generator, hash});
    }

    return nodes;
  }

  upperFirst(s: string): string {
    return s[0].toUpperCase() + s.slice(1);
  }

  outputName(baseName: string): string { return ''; }

  fileHeader(outName: string): string { return ''; }

  fileFooter(): string { return ''; }

  abstract getClassGenerator(node: SchemaNode): ClassGenerator;

  abstract generateParticleClass(particle: ParticleSpec, nodes: NodeAndGenerator[]): string;

  abstract generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): string;
}
