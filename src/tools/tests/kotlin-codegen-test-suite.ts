/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SchemaGraph} from '../schema2graph.js';
import {generateSchema} from '../kotlin-schema-generator.js';
import {ManifestCodegenUnitTest} from './codegen-unit-test-base.js';
import {KTExtracter} from '../kotlin-refinement-generator.js';
import {CodegenUnitTest} from './codegen-unit-test-base.js';
import {KotlinEntityGenerator} from '../kotlin-entity-generator.js';
import {Schema2Kotlin} from '../schema2kotlin.js';
import {generateConnectionSpecType, generateType} from '../kotlin-type-generator.js';
import {generateFields} from '../kotlin-schema-field.js';

/**
 * A Suite of unit tests for Kotlin Codegen.
 * The test data is inside .cgtest files.
 */
export const testSuite: CodegenUnitTest[] = [
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Schema Generation',
        'kotlin-schema-generation.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const graph = new SchemaGraph(particles[0]);
      return Promise.all(graph.nodes.map(async node => {
        await Promise.all([node, ...node.refs.values()].map(n => n.calculateHash()));
        return generateSchema(node.schema);
      }));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Refinement Generator',
        'kotlin-refinement-generator.cgtest',
        {fieldRefinementsAllowed: true}
      );
    }
    async computeFromManifest({particles}) {
      const schema = particles[0].handleConnectionMap.get('input').type.getEntitySchema();
      return KTExtracter.fromSchema(schema);
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Entity Class Generation',
        'kotlin-entity-class.cgtest'
      );
    }
    async computeFromManifest({particles}, opts: object) {
      const schema2kotlin = new Schema2Kotlin({_: [], wasm: opts['wasm'] || false});
      const generators = (await schema2kotlin.calculateNodeAndGenerators(particles[0]));
      return Promise.all(generators.map(gn => (gn.generator as KotlinEntityGenerator).generateClasses()));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Entity Fields Generation',
        'kotlin-entity-fields.cgtest'
      );
    }
    async computeFromManifest({particles}, opts: object) {
      const schema2kotlin = new Schema2Kotlin({_: [], wasm: opts['wasm'] || false});
      let generators = (await schema2kotlin.calculateNodeAndGenerators(particles[0]));
      if (opts['assertedSchema']) {
        generators = generators.filter(gn => gn.node.schema.name === opts['assertedSchema']);
      }
      return Promise.all(generators.map(gn => (gn.generator as KotlinEntityGenerator).generateFieldsDefinitions()));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Type Generation',
        'kotlin-type-generator.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      return generateType(particles[0].handleConnections[0].type);
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Connection Type Generation',
        'kotlin-connection-type-generator.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const schemaGraph = new SchemaGraph(particles[0]);
      const [connection] = particles[0].handleConnections;
      return generateConnectionSpecType(connection, schemaGraph.nodes);
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Handle Interface Types',
        'kotlin-handle-interface-types.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const graph = new SchemaGraph(particles[0]);
      const schema2kotlin = new Schema2Kotlin({_: []});
      return particles[0].connections.map(c => schema2kotlin.handleInterfaceType(c, graph.nodes, true));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Handles Class Declarations',
        'kotlin-handles-class-declarations.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const schema2kotlin = new Schema2Kotlin({_: []});
      const generators = await schema2kotlin.calculateNodeAndGenerators(particles[0]);
      const components = await schema2kotlin.generateParticleClassComponents(particles[0], generators);
      return components.handleClassDecl;
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Schema Aliases',
        'kotlin-schema-aliases.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const schema2kotlin = new Schema2Kotlin({_: []});
      const generators = await schema2kotlin.calculateNodeAndGenerators(particles[0]);
      const components = await schema2kotlin.generateParticleClassComponents(particles[0], generators);
      return components.typeAliases.sort();
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Test Harness',
        'kotlin-test-harness.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const schema2kotlin = new Schema2Kotlin({_: []});
      const generators = await schema2kotlin.calculateNodeAndGenerators(particles[0]);
      return schema2kotlin.generateTestHarness(particles[0], generators.map(g => g.node));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Schema Fields',
        'kotlin-schema-fields.cgtest'
      );
    }
    async computeFromManifest({particles}) {
      const graph = new SchemaGraph(particles[0]);
      return generateFields(graph.nodes[0]).map(field => field.type.kotlinType);
    }
  }(),
];
