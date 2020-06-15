/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {ClassGenerator, NodeAndGenerator, Schema2Base} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {generateConnectionSpecType, getTypeInfo} from './kotlin-codegen-shared.js';
import {HandleConnectionSpec, ParticleSpec} from '../runtime/particle-spec.js';
import {CollectionType, EntityType, Type, TypeVariable} from '../runtime/type.js';
import {KotlinGenerationUtils} from './kotlin-generation-utils.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';
import {KotlinGenerator} from './kotlin-class-generator.js';

// TODO: use the type lattice to generate interfaces

const ktUtils = new KotlinGenerationUtils();

export class Schema2Kotlin extends Schema2Base {
  // test-KOTLIN.file_Name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(_outName: string): string {
    const imports = [
      'import arcs.sdk.*',
    ];

    if (this.opts.test_harness) {
      imports.push(
        'import arcs.core.data.EntityType',
        'import arcs.core.data.CollectionType',
        'import arcs.core.data.ReferenceType',
        'import arcs.core.data.SingletonType',
        'import arcs.core.data.TupleType',
        'import arcs.core.entity.HandleContainerType',
        'import arcs.core.entity.HandleDataType',
        'import arcs.core.entity.HandleMode',
        'import arcs.core.entity.HandleSpec',
        'import arcs.core.entity.Tuple1',
        'import arcs.core.entity.Tuple2',
        'import arcs.core.entity.Tuple3',
        'import arcs.core.entity.Tuple4',
        'import arcs.core.entity.Tuple5',
        'import arcs.sdk.testing.*',
        'import kotlinx.coroutines.CoroutineScope',
      );
    } else if (this.opts.wasm) {
      imports.push(
        'import arcs.sdk.wasm.*',
      );
    } else {
      // Imports for jvm.
      imports.push(
        'import arcs.core.data.*',
        'import arcs.core.data.util.toReferencable',
        'import arcs.core.data.util.ReferencablePrimitive',
        'import arcs.core.entity.toPrimitiveValue',
        'import arcs.core.entity.Reference',
        'import arcs.core.entity.SchemaRegistry',
        'import arcs.core.entity.Tuple1',
        'import arcs.core.entity.Tuple2',
        'import arcs.core.entity.Tuple3',
        'import arcs.core.entity.Tuple4',
        'import arcs.core.entity.Tuple5',
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
// Current implementation doesn't support optional field detection

${imports.join('\n')}
`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node, this.opts);
  }

  /** Returns the container type of the handle, e.g. Singleton or Collection. */
  private handleContainerType(type: Type): string {
    return type.isCollectionType() ? 'Collection' : 'Singleton';
  }

  /**
   * Returns the type of the thing stored in the handle, e.g. MyEntity,
   * Reference<MyEntity>, Tuple2<Reference<Entity1>, Reference<Entity2>>.
   *
   * @param particleScope whether the generated declaration will be used inside the particle or outside it.
   */
  private handleInnerType(connection: HandleConnectionSpec, nodes: SchemaNode[], particleScope: boolean): string {
    let type = connection.type;
    if (type.isCollection || type.isSingleton) {
      // The top level collection / singleton distinction is handled by the flavour of a handle.
      type = type.getContainedType();
    }

    function generateInnerType(type: Type): string {
      if (type.isEntity || type.isVariable) {
          const node = type.isEntity
            ? nodes.find(n => n.variableName === null && n.schema.equals(type.getEntitySchema()))
            : nodes.find(n => n.variableName.includes((type as TypeVariable).variable.name));
          return particleScope ? node.humanName(connection) : node.fullName(connection);
      } else if (type.isReference) {
        return `Reference<${generateInnerType(type.getContainedType())}>`;
      } else if (type.isTuple) {
        const innerTypes = type.getContainedTypes();
        return `Tuple${innerTypes.length}<${innerTypes.map(t => generateInnerType(t)).join(', ')}>`;
      } else {
        throw new Error(`Type '${type.tag}' not supported on code generated particle handle connections.`);
      }
    }

    return generateInnerType(type);
  }

  /** Returns one of Read, Write, ReadWrite. */
  private handleDirection(direction: Direction): string {
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

  private handleMode(connection: HandleConnectionSpec): string {
    const direction = this.handleDirection(connection.direction);
    const querySuffix = this.getQueryType(connection) ? 'Query' : '';
    return `${direction}${querySuffix}`;
  }

  /**
   * Returns the handle interface type, e.g. WriteSingletonHandle,
   * ReadWriteCollectionHandle. Includes generic arguments.
   *
   * @param particleScope whether the generated declaration will be used inside the particle or outside it.
   */
  handleInterfaceType(connection: HandleConnectionSpec, nodes: SchemaNode[], particleScope: boolean) {
    if (connection.direction !== 'reads' && connection.direction !== 'writes' && connection.direction !== 'reads writes') {
      throw new Error(`Unsupported handle direction: ${connection.direction}`);
    }

    const containerType = this.handleContainerType(connection.type);
    if (this.opts.wasm) {
      const topLevelNodes = SchemaNode.topLevelNodes(connection, nodes);
      if (topLevelNodes.length !== 1) throw new Error('Wasm does not support handles of tuples');
      const entityType = topLevelNodes[0].humanName(connection);
      return `Wasm${containerType}Impl<${entityType}>`;
    }

    const handleMode = this.handleMode(connection);
    const innerType = this.handleInnerType(connection, nodes, particleScope);
    const typeArguments: string[] = [innerType];
    const queryType = this.getQueryType(connection);
    if (queryType) {
      typeArguments.push(queryType);
    }
    return `${handleMode}${containerType}Handle<${ktUtils.joinWithIndents(typeArguments, {startIndent: 4})}>`;
  }

  private handleSpec(handleName: string, connection: HandleConnectionSpec, nodes: SchemaNode[]): string {
    const mode = this.handleMode(connection);
    const type = generateConnectionSpecType(connection, nodes);
    // Using full names of entities, as these are aliases available outside the particle scope.
    const entityNames = SchemaNode.topLevelNodes(connection, nodes).map(node => node.fullName(connection));
    return ktUtils.applyFun(
        'HandleSpec',
        [`"${handleName}"`, `HandleMode.${mode}`, type, ktUtils.setOf(entityNames)],
        {numberOfIndents: 1}
    );
  }

  generateParticleClass(particle: ParticleSpec, nodeGenerators: NodeAndGenerator[]): string {
    const {typeAliases, classes, handleClassDecl} = this.generateParticleClassComponents(particle, nodeGenerators);
    return `
${typeAliases.join(`\n`)}

abstract class Abstract${particle.name} : ${this.opts.wasm ? 'WasmParticleImpl' : 'BaseParticle'}() {
    ${this.opts.wasm ? '' : 'override '}val handles: Handles = Handles(${this.opts.wasm ? 'this' : ''})

    ${classes.join(`\n    `)}

    ${handleClassDecl}
}
`;
  }

  generateParticleClassComponents(particle: ParticleSpec, nodeGenerators: NodeAndGenerator[]) {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const specDecls: string[] = [];
    const classes: string[] = [];
    const typeAliases: string[] = [];

    nodeGenerators.forEach(nodeGenerator => {
      const kotlinGenerator = <KotlinGenerator>nodeGenerator.generator;
      classes.push(kotlinGenerator.generateClasses(nodeGenerator.hash));
      typeAliases.push(...kotlinGenerator.generateAliases(particleName));
    });

    const nodes = nodeGenerators.map(ng => ng.node);
    for (const connection of particle.connections) {
      const handleName = connection.name;
      const handleInterfaceType = this.handleInterfaceType(connection, nodes, /* particleScope= */ true);
      const entityNames = SchemaNode.topLevelNodes(connection, nodes).map(node => node.humanName(connection));
      if (this.opts.wasm) {
        if (entityNames.length !== 1) throw new Error('Wasm does not support handles of tuples');
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} = ${handleInterfaceType}(particle, "${handleName}", ${entityNames[0]})`);
      } else {
        specDecls.push(`"${handleName}" to ${ktUtils.setOf(entityNames)}`);
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} by handles`);
      }
    }

    const handleClassDecl = this.getHandlesClassDecl(particleName, specDecls, handleDecls);

    return {typeAliases, classes, handleClassDecl};
  }

  private getHandlesClassDecl(particleName: string, entitySpecs: string[], handleDecls: string[]): string {
    const header = this.opts.wasm
      ? `class Handles(
        particle: WasmParticleImpl
    )`
      : `class Handles : HandleHolderBase(
        "${particleName}",
        mapOf(${ktUtils.joinWithIndents(entitySpecs, {startIndent: 4, numberOfIndents: 3})})
    )`;

    return `${header} {
        ${handleDecls.join('\n        ')}
    }`;
  }

  generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const handleSpecs: string[] = [];

    for (const connection of particle.connections) {
      const handleName = connection.name;

      // Particle handles are set up with the read/write mode from the manifest.
      handleSpecs.push(this.handleSpec(handleName, connection, nodes));

      // The harness has a "copy" of each handle with full read/write access.
      connection.direction = 'reads writes';
      const interfaceType = this.handleInterfaceType(connection, nodes, /* particleScope= */ false);
      handleDecls.push(`val ${handleName}: ${interfaceType} by handleMap`);
    }

    return `
class ${particleName}TestHarness<P : Abstract${particleName}>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    ${handleSpecs.join(',\n    ')}
)) {
    ${handleDecls.join('\n    ')}
}
`;
  }

  private getQueryType(connection: HandleConnectionSpec): string {
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
    return getTypeInfo({name: type}).type;
  }
}

