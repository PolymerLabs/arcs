/**
 * @license
 * Copyright (c) 2021 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {EntityGenerator, NodeAndGenerator, Schema2Base} from './schema2base.js';
import {Manifest} from '../runtime/manifest.js';
import {SchemaGraph, SchemaNode} from './schema2graph.js';
import {ParticleSpec} from '../runtime/arcs-types/particle-spec.js';

/**
 * Generates a Graphviz file for the type lattice. To convert to an image, run the command:
 *  dot -Tsvg file.dot -o file.svg
 *
 * Nodes are labelled with the particle+handle names that reference each schema and the field names
 * for the schema, with fields inherited from other schemas placed in parentheses.
 */
export class Schema2Dot extends Schema2Base {
  outputName(baseName: string): string {
    return baseName.replace(/\.arcs$/, '.dot');
  }

  fileHeader(outName: string): string {
    return `\
digraph {
  node [shape="box", fontname="arial"]
`;
  }

  fileFooter(): string { return '}\n'; }

  async processManifest(manifest: Manifest): Promise<string[]> {
    const dot: string[] = [];
    for (const particle of manifest.particles) {
      const graph = new SchemaGraph(particle);
      for (const node of graph.nodes) {
        await node.calculateHash();
      }
      for (const node of graph.walk()) {
        const sources = node.sources.map(s => s.fullName).join(', ');
        const inherited = '(' + Object.keys(node.schema.fields).filter(f => !node.addedFields.includes(f)).join(', ') + ')';
        let fields;
        if (inherited === '()') {
          fields = node.addedFields.join(', ');
        } else if (node.addedFields.length === 0) {
          fields = inherited;
        } else {
          fields = [...node.addedFields, inherited].join(', ');
        }
        dot.push('\n');
        dot.push(`  "${this.dotName(node)}" [label="${sources}\\n${fields}"]\n`);
        for (const c of node.children) {
          dot.push(`  "${this.dotName(node)}" -> "${this.dotName(c)}"\n`);
        }
      }
    }
    return dot;
  }

  private dotName(node: SchemaNode): string {
    const variable = (node.variableName != null) ? ('~' + node.variableName) : '';
    return node.particleSpec.name + '_' + node.hash + variable;
  }

  getEntityGenerator(node: SchemaNode): EntityGenerator {
    throw new Error('unimplemented');
  }

  async generateParticleClass(particle: ParticleSpec, nodes: NodeAndGenerator[]): Promise<string> {
    throw new Error('unimplemented');
  }

  async generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): Promise<string> {
    throw new Error('unimplemented');
  }
}
