/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {EntityGenerator, NodeAndGenerator, Schema2Base} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {getPrimitiveTypeInfo} from './kotlin-schema-field.js';
import {generateConnectionSpecType} from './kotlin-type-generator.js';
import {HandleConnectionSpec, ParticleSpec} from '../runtime/arcs-types/particle-spec.js';
import {CollectionType, EntityType, Type, TypeVariable} from '../types/lib-types.js';
import {KotlinGenerationUtils} from './kotlin-generation-utils.js';
import {Direction} from '../runtime/arcs-types/enums.js';
import {KotlinEntityGenerator, interfaceName} from './kotlin-entity-generator.js';

// TODO(b/182330900): use the type lattice to generate interfaces

const ktUtils = new KotlinGenerationUtils();

export class Schema2Kotlin extends Schema2Base {
  // test-KOTLIN.file_Name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(outName: string): string {
    const imports = [];

    if (this.opts.test_harness) {
      imports.push(
        'import arcs.sdk.Particle',
        'import arcs.sdk.testing.*',
        'import arcs.sdk.ArcsDuration',
        'import arcs.sdk.ArcsInstant',
        'import arcs.sdk.BigInt',
        'import arcs.sdk.toBigInt',
        'import kotlinx.coroutines.CoroutineScope',
      );
    } else if (this.opts.wasm) {
      imports.push(
        'import arcs.sdk.wasm.*',
      );
    } else {
      // Imports for jvm.
      imports.push(
        'import arcs.core.data.Annotation',
        'import arcs.core.data.expression.*',
        'import arcs.core.data.expression.Expression.*',
        'import arcs.core.data.expression.Expression.BinaryOp.*',
        'import arcs.core.data.util.toReferencable',
        'import arcs.sdk.ArcsDuration',
        'import arcs.sdk.ArcsInstant',
        'import arcs.sdk.BigInt',
        'import arcs.sdk.Entity',
        'import arcs.sdk.toBigInt',
        'import javax.annotation.Generated',
      );
    }
    imports.sort();

    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.namespace}

//
// GENERATED CODE -- DO NOT EDIT
//

${imports.join('\n')}
`;
  }

  getEntityGenerator(node: SchemaNode): EntityGenerator {
    return new KotlinEntityGenerator(node, this.opts);
  }

  async generateParticleClass(particle: ParticleSpec, nodeGenerators: NodeAndGenerator[]): Promise<string> {
    const generator = new KotlinParticleGenerator(this, particle, nodeGenerators);
    return generator.generateParticleClass();
  }

  async generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): Promise<string> {
    const generator = new KotlinTestHarnessGenerator(this, particle, nodes);
    return generator.generateTestHarness();
  }
}

export class GeneratorBase {
  constructor(readonly isWasm: boolean, readonly namespace: string) {}

  /**
   * Returns the handle interface type, e.g. WriteSingletonHandle,
   * ReadWriteCollectionHandle. Includes generic arguments.
   *
   * @param particleScope whether the generated declaration will be used inside the particle or outside it.
   *
   * Visible for testing.
   */
  handleInterfaceType(connection: HandleConnectionSpec, nodes: SchemaNode[], particleScope: boolean) {
    if (connection.direction !== 'reads' && connection.direction !== 'writes' && connection.direction !== 'reads writes') {
      throw new Error(`Unsupported handle direction: ${connection.direction}`);
    }

    const containerType = this.handleContainerType(connection.type);
    if (this.isWasm) {
      const topLevelNodes = SchemaNode.topLevelNodes(connection, nodes);
      if (topLevelNodes.length !== 1) throw new Error('Wasm does not support handles of tuples');
      const entityType = topLevelNodes[0].humanName(connection);
      return `Wasm${containerType}Impl<${entityType}>`;
    }

    const handleMode = this.handleMode(connection);
    const typeArguments = this.handleTypeArguments(connection, nodes, particleScope);
    const queryType = this.getQueryType(connection);
    if (queryType) {
      typeArguments.push(queryType);
    }
    return `arcs.sdk.${handleMode}${containerType}Handle<${ktUtils.joinWithIndents(typeArguments, {startIndent: 4})}>`;
  }

  protected async handleSpec(handleName: string, connection: HandleConnectionSpec, nodes: SchemaNode[]): Promise<string> {
    const mode = this.handleMode(connection);
    const type = await generateConnectionSpecType(connection, nodes, {namespace: this.namespace});
    // Using full names of entities, as these are aliases available outside the particle scope.
    const entityNames = SchemaNode.topLevelNodes(connection, nodes).map(node => node.fullName(connection));
    return ktUtils.applyFun(
        'arcs.core.entity.HandleSpec',
        [`"${handleName}"`, `arcs.core.data.HandleMode.${mode}`, type, ktUtils.setOf(entityNames)],
        {numberOfIndents: 1}
    );
  }

  /**
   * Returns the type(s) required for the handle. Entity handles will use the concrete entity
   * and/or entity interface depending on the direction of the handle. Reference handles will
   * only use a reference to the concrete entity class:
   *
   *  entity read:          ['MyEntity']
   *  entity write:         ['MyEntitySlice']
   *  entity read/write:    ['MyEntity', 'MyEntitySlice']
   *
   *  reference read:       ['Reference<MyEntity>']
   *  reference write:      ['Reference<MyEntity>']
   *  reference read/write: ['Reference<MyEntity>', 'Reference<MyEntity>']
   *
   * @param particleScope whether the generated declaration will be used inside the particle or outside it.
   */
  protected handleTypeArguments(connection: HandleConnectionSpec, nodes: SchemaNode[], particleScope: boolean): string[] {
    let type = connection.type;
    if (type.isCollection || type.isSingleton) {
      // The top level collection / singleton distinction is handled by the flavour of a handle.
      type = type.getContainedType();
    }

    function generateInnerType(type: Type, isInterface: boolean): string {
      if (type.isEntity || type.isVariable) {
          const node = type.isEntity
            ? nodes.find(n => n.variableName === null && n.schema.equals(type.getEntitySchema()))
            : nodes.find(n => n.variableName === (type as TypeVariable).variable.name);
          const name = particleScope ? node.humanName(connection) : node.fullName(connection);
          return isInterface ? interfaceName(name) : name;
      } else if (type.isReference) {
        return `arcs.sdk.Reference<${generateInnerType(type.getContainedType(), false)}>`;
      } else if (type.isTuple) {
        const innerTypes = type.getContainedTypes();
        const tupleTypes = innerTypes.map(t => generateInnerType(t, isInterface)).join(', ');
        return `arcs.core.entity.Tuple${innerTypes.length}<${tupleTypes}>`;
      } else {
        throw new Error(`Type '${type.tag}' not supported on code generated particle handle connections.`);
      }
    }

    const res = [];
    if (connection.direction.includes('reads')) {
      res.push(generateInnerType(type, false));
    }
    if (connection.direction.includes('writes')) {
      // TODO(b/182330900): temporary state; will flip to true when type slicing logic is added
      res.push(generateInnerType(type, false));
    }
    return res;
  }

  protected handleContainerType(type: Type): string {
    return type.isCollectionType() ? 'Collection' : 'Singleton';
  }

  protected handleMode(connection: HandleConnectionSpec): string {
    const direction = this.handleDirection(connection.direction);
    const querySuffix = this.getQueryType(connection) ? 'Query' : '';
    return `${direction}${querySuffix}`;
  }

  protected handleDirection(direction: Direction): string {
    switch (direction) {
      case 'reads writes':
        return 'ReadWrite';
      case 'reads':
        return 'Read';
      case 'writes':
        return 'Write';
      default:
        throw new Error(`Unsupported handle direction: ${direction}`);
    }
  }

  protected getQueryType(connection: HandleConnectionSpec): string {
    if (!(connection.type instanceof CollectionType)) {
      return null;
    }
    const handleType = connection.type.getContainedType();
    if (!(handleType instanceof EntityType)) {
      return null;
    }
    const refinement = handleType.entitySchema.refinement;
    if (!refinement) {
      return null;
    }
    const type = refinement.getQueryParams().get('?');
    if (!type) {
      return null;
    }
    return getPrimitiveTypeInfo(type).type;
  }
}

export class KotlinParticleGenerator extends GeneratorBase {
  constructor(parent: Schema2Kotlin, readonly particle: ParticleSpec, readonly nodeGenerators: NodeAndGenerator[]) {
    super(parent.opts.wasm, parent.namespace);
  }

  async generateParticleClass(): Promise<string> {
    const {typeAliases, classes, handleClassDecl} = await this.generateParticleClassComponents();
    return `
${typeAliases.join(`\n`)}

@Generated("src/tools/schema2kotlin.ts")
abstract class Abstract${this.particle.name} : ${this.isWasm ? 'WasmParticleImpl' : 'arcs.sdk.BaseParticle'}() {
    ${this.isWasm ? '' : 'override '}val handles: Handles = Handles(${this.isWasm ? 'this' : ''})

    ${ktUtils.indentFollowing(classes, 1)}

    ${handleClassDecl}
}
`;
  }

  async generateParticleClassComponents() {
    const handleDecls: string[] = [];
    const specDecls: string[] = [];
    const classes: string[] = [];
    const typeAliases: string[] = [];

    for (const nodeGenerator of this.nodeGenerators) {
      const kotlinGenerator = nodeGenerator.generator as KotlinEntityGenerator;
      classes.push(await kotlinGenerator.generateClasses());
      typeAliases.push(...kotlinGenerator.generateAliases(this.particle.name));
    }

    const nodes = this.nodeGenerators.map(ng => ng.node);
    for (const connection of this.particle.connections) {
      const handleName = connection.name;
      const handleInterfaceType = this.handleInterfaceType(connection, nodes, /* particleScope= */ true);
      const entityNames = SchemaNode.topLevelNodes(connection, nodes).map(node => node.humanName(connection));
      if (this.isWasm) {
        if (entityNames.length !== 1) throw new Error('Wasm does not support handles of tuples');
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} = ${handleInterfaceType}(particle, "${handleName}", ${entityNames[0]})`);
      } else {
        specDecls.push(`"${handleName}" to ${ktUtils.setOf(entityNames)}`);
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} by handles`);
      }
    }

    const header = this.isWasm
      ? `${handleDecls.length ? '' : '@Suppress("UNUSED_PARAMETER")\n    '}class Handles(
        particle: WasmParticleImpl
    )`
      : `class Handles : arcs.sdk.HandleHolderBase(
        "${this.particle.name}",
        mapOf(${ktUtils.joinWithIndents(specDecls, {startIndent: 4, numberOfIndents: 3})})
    )`;

    const handleClassDecl = `${header} {
        ${ktUtils.indentFollowing(handleDecls, 2)}
    }`;

    return {typeAliases, classes, handleClassDecl};
  }
}

class KotlinTestHarnessGenerator extends GeneratorBase {
  constructor(parent: Schema2Kotlin, readonly particle: ParticleSpec, readonly nodes: SchemaNode[]) {
    super(parent.opts.wasm, parent.namespace);
  }

  async generateTestHarness(): Promise<string> {
    const particleName = this.particle.name;
    const handleDecls: string[] = [];
    const handleSpecs: string[] = [];

    for (const connection of this.particle.connections) {
      const handleName = connection.name;

      // Particle handles are set up with the read/write mode from the manifest.
      handleSpecs.push(await this.handleSpec(handleName, connection, this.nodes));

      // The harness has a "copy" of each handle with full read/write access.
      connection.direction = 'reads writes';
      const interfaceType = this.handleInterfaceType(connection, this.nodes, /* particleScope= */ false);
      handleDecls.push(`val ${handleName}: ${interfaceType} by handleMap`);
    }

    return `
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class ${particleName}TestHarness<P : Particle>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    ${handleSpecs.join(',\n    ')}
)) {
    ${handleDecls.join('\n    ')}
}
`;
  }
}
