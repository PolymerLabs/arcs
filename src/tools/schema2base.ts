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

export interface ClassGenerator {
  addField(field: string, typeChar: string, isOptional: boolean, refClassName: string|null): void;
  generate(schemaHash: string, fieldCount: number): string;
}

export abstract class Schema2Base {
  scope: string;

  constructor(readonly opts: minimist.ParsedArgs) {
    Runtime.init('../..');
    this.scope = this.opts.package || 'arcs.sdk';
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

    const manifest = await Runtime.parseFile(src);
    if (manifest.errors.some(e => e.severity !== 'warning')) {
      return;
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
      const graph = new SchemaGraph(particle);
      // Generate one class definition per node in the graph.
      for (const node of graph.walk()) {
        const generator = this.getClassGenerator(node);
        const fields = Object.entries(node.schema.fields);

        for (const [field, descriptor] of fields) {
          if (descriptor.kind === 'schema-primitive') {
            if (['Text', 'URL', 'Number', 'Boolean'].includes(descriptor.type)) {
              generator.addField(field, descriptor.type[0], false, null);
            } else {
              throw new Error(`Schema type '${descriptor.type}' for field '${field}' is not supported`);
            }
          } else if (descriptor.kind === 'schema-reference') {
            generator.addField(field, 'R', false, node.refs.get(field).name);
          } else if (descriptor.kind === 'schema-collection' && descriptor.schema.kind === 'schema-reference') {
            // TODO: support collections of references
          } else {
            throw new Error(`Schema kind '${descriptor.kind}' for field '${field}' is not supported`);
          }
        }
        classes.push(generator.generate(await node.schema.hash(), fields.length));
      }

      classes.push(this.generateParticleClass(particle));
    }
    return classes;
  }

  upperFirst(s: string): string {
    return s[0].toUpperCase() + s.slice(1);
  }

  outputName(baseName: string): string { return ''; }

  fileHeader(outName: string): string { return ''; }

  fileFooter(): string { return ''; }

  abstract getClassGenerator(node: SchemaNode): ClassGenerator;

  abstract generateParticleClass(particle: ParticleSpec): string;
}
