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

export interface EntityGenerator {
  generate(): string;
}

export class NodeAndGenerator {
  node: SchemaNode;
  generator: EntityGenerator;
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
        classes.push(await this.generateTestHarness(particle, nodes.map(n => n.node)));
        continue;
      }

      classes.push(await this.generateParticleClass(particle, nodes));
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

  abstract async generateParticleClass(particle: ParticleSpec, nodes: NodeAndGenerator[]): Promise<string>;

  abstract async generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): Promise<string>;
}
