/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base, ClassGenerator, AddFieldOptions, NodeAndGenerator} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {ParticleSpec, HandleConnectionSpec} from '../runtime/particle-spec.js';
import {EntityType, CollectionType} from '../runtime/type.js';
import {KTExtracter} from '../runtime/refiner.js';
import {Dictionary} from '../runtime/hot.js';
import minimist from 'minimist';
import {KotlinGenerationUtils, leftPad, quote} from './kotlin-generation-utils.js';
import {assert} from '../platform/assert-web.js';

// TODO: use the type lattice to generate interfaces

// https://kotlinlang.org/docs/reference/keyword-reference.html
// [...document.getElementsByTagName('code')].map(x => x.innerHTML);
// Includes reserve words for Entity Interface
const keywords = [
  'as', 'as?', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', '!in', 'interface', 'is',
  '!is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var',
  'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import',
  'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where', 'actual', 'abstract', 'annotation', 'companion',
  'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal',
  'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed',
  'suspend', 'tailrec', 'vararg', 'it', 'entityId'
];

export interface KotlinTypeInfo {
  type: string;
  decodeFn: string;
  defaultVal: string;
  schemaType: string;
}

function getTypeInfo(opts: {name: string, isCollection?: boolean, refClassName?: string, refSchemaHash?: string}): KotlinTypeInfo {
  const typeMap: Dictionary<KotlinTypeInfo> = {
    'Text': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
    'URL': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
    'Number': {type: 'Double',  decodeFn: 'decodeNum()',  defaultVal: '0.0', schemaType: 'FieldType.Number'},
    'Boolean': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false', schemaType: 'FieldType.Boolean'},
    'Reference': {
      type: `Reference<${opts.refClassName}>`,
      decodeFn: null,
      defaultVal: 'null',
      schemaType: `FieldType.EntityRef(${quote(opts.refSchemaHash)})`,
    },
  };

  const info = typeMap[opts.name];
  if (!info) {
    throw new Error(`Unhandled type '${opts.name}' for kotlin.`);
  }
  if (opts.name === 'Reference') {
    assert(opts.refClassName, 'refClassName must be provided for References');
    assert(opts.refSchemaHash, 'refSchemaHash must be provided for References');
    if (!opts.isCollection) {
      // Singleton Reference fields are nullable.
      info.type += '?';
    }
  }
  if (opts.isCollection) {
    info.defaultVal = `emptySet<${info.type}>()`;
    info.type = `Set<${info.type}>`;
  }
  return info;
}

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
        'import arcs.core.entity.HandleContainerType',
        'import arcs.core.entity.HandleMode',
        'import arcs.core.entity.HandleSpec',
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

  private entityTypeName(particle: ParticleSpec, connection: HandleConnectionSpec) {
    return `${this.upperFirst(connection.name)}`;
  }

  generateParticleClass(particle: ParticleSpec, nodeGenerators: NodeAndGenerator[]): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const specDecls: string[] = [];
    const classes: string[] = [];
    const typeAliases: string[] = []

    nodeGenerators.forEach( (ng) => {
      //await node.schema.hash(), fields.length)
      const kotlinGenerator = <KotlinGenerator>ng.generator
      classes.push(kotlinGenerator.generateClasses(ng.hash, ng.fieldLength));
      typeAliases.push(kotlinGenerator.generateAliases(`Abstract${particleName}`))
    })

    for (const connection of particle.connections) {
      const handleName = connection.name;
      const entityType = this.entityTypeName(particle, connection);
      const handleConcreteType = connection.type.isCollectionType() ? 'Collection' : 'Singleton';
      let handleInterfaceType: string;
      if (this.opts.wasm) {
        handleInterfaceType = this.prefixTypeForRuntime(`${handleConcreteType}Impl<${entityType}>`);
      } else {
        if (connection.direction !== 'reads' && connection.direction !== 'writes' && connection.direction !== 'reads writes') {
            throw new Error(`Unsupported handle direction: ${connection.direction}`);
        }
        const handleInterfaces: string[] = [];
        const typeArguments: string[] = [entityType];
        if (connection.direction === 'reads' || connection.direction === 'reads writes') {
          handleInterfaces.push('Read');
        }
        if (connection.direction === 'writes' || connection.direction === 'reads writes') {
          handleInterfaces.push('Write');
        }
        const queryType = this.getQueryType(connection);
        if (queryType) {
          handleInterfaces.push('Query');
          typeArguments.push(queryType);
        }
        handleInterfaceType = this.prefixTypeForRuntime(`${handleInterfaces.join('')}${handleConcreteType}Handle<${ktUtils.joinWithIndents(typeArguments, 4)}>`);
      }
      if (this.opts.wasm) {
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} = ${this.prefixTypeForRuntime(handleConcreteType) + 'Impl'}(particle, "${handleName}", ${entityType})`);
      } else {
        specDecls.push(`"${handleName}" to ${entityType}`);
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} by handles`);
      }

    }
    return `
${typeAliases.join(`\n`)}
abstract class Abstract${particleName} : ${this.opts.wasm ? 'WasmParticleImpl' : 'BaseParticle'}() {
    ${this.opts.wasm ? '' : 'override '}val handles: Handles = Handles(${this.opts.wasm ? 'this' : ''})

    ${classes.join(`\n    `)}

    ${this.getHandlesClassDecl(particleName, specDecls)} {
        ${handleDecls.join('\n        ')}
    }
}
`;
  }

  generateTestHarness(particle: ParticleSpec): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const handleSpecs: string[] = [];

    for (const connection of particle.connections) {
      const handleName = connection.name;
      const entityType =`${particleName}.${this.entityTypeName(particle, connection)}`;
      console.log(`entityType: ${entityType}`)
      const handleConcreteType = connection.type.isCollectionType() ? 'Collection' : 'Singleton';
      handleDecls.push(`val ${handleName}: ReadWrite${handleConcreteType}Handle<${entityType}> by handleMap`);
      handleSpecs.push(`HandleSpec("${handleName}", HandleMode.ReadWrite, HandleContainerType.${handleConcreteType}, ${entityType})`);
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

  private getHandlesClassDecl(particleName: string, entitySpecs: string[]): string {
    if (this.opts.wasm) {
      return `class Handles(
        particle: WasmParticleImpl
    )`;
    } else {
      return `class Handles : HandleHolderBase(
        "${particleName}",
        mapOf(${ktUtils.joinWithIndents(entitySpecs, 4, 3)})
    )`;
    }
  }

  private prefixTypeForRuntime(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : type;
  }
}

export class KotlinGenerator implements ClassGenerator {
  fields: string[] = [];
  fieldVals: string[] = [];
  encode: string[] = [];
  decode: string[] = [];
  fieldsReset: string[] = [];
  fieldInitializers: string[] = [];
  fieldsForCopyDecl: string[] = [];
  fieldsForCopy: string[] = [];
  setFieldsToDefaults: string[] = [];
  fieldsForToString: string[] = [];
  singletonSchemaFields: string[] = [];
  collectionSchemaFields: string[] = [];

  refinement = `{ _ -> true }`;
  query = 'null'; // TODO(cypher1): Support multiple queries.

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {}

  escapeIdentifier(name: string): string {
    // TODO(cypher1): Check for complex keywords (e.g. cases where both 'final' and 'final_' are keywords).
    // TODO(cypher1): Check for name overlaps (e.g. 'final' and 'final_' should not be escaped to the same identifier.
    return name + (keywords.includes(name) ? '_' : '');
  }

  // TODO: allow optional fields in kotlin
  addField({field, typeName, refClassName, refSchemaHash, isOptional = false, isCollection = false}: AddFieldOptions) {
    if (typeName === 'Reference' && this.opts.wasm) return;

    const {type, decodeFn, defaultVal, schemaType} = getTypeInfo({name: typeName, isCollection, refClassName, refSchemaHash});
    const fixed = this.escapeIdentifier(field);
    const quotedFieldName = quote(field);
    const nullableType = type.endsWith('?') ? type : `${type}?`;

    this.fields.push(`${fixed}: ${type} = ${defaultVal}`);
    if (this.opts.wasm) {
      // TODO: Add support for collections in wasm.
      assert(!isCollection, 'Collection fields not supported in Kotlin wasm yet.');
      this.fieldVals.push(
        `var ${fixed} = ${fixed}\n` +
        `        get() = field\n` +
        `        private set(_value) {\n` +
        `            field = _value\n` +
        `        }`
      );
    } else if (isCollection) {
      this.fieldVals.push(
        `var ${fixed}: ${type}\n` +
        `        get() = super.getCollectionValue(${quotedFieldName}) as ${type}\n` +
        `        private set(_value) = super.setCollectionValue(${quotedFieldName}, _value)`
        );
    } else {
      const defaultFallback = defaultVal === 'null' ? '' : ` ?: ${defaultVal}`;
      this.fieldVals.push(
        `var ${fixed}: ${type}\n` +
        `        get() = super.getSingletonValue(${quotedFieldName}) as ${nullableType}${defaultFallback}\n` +
        `        private set(_value) = super.setSingletonValue(${quotedFieldName}, _value)`
      );
    }
    this.fieldsReset.push(`${fixed} = ${defaultVal}`);
    this.fieldInitializers.push(`this.${fixed} = ${fixed}`);
    this.fieldsForCopyDecl.push(`${fixed}: ${type} = this.${fixed}`);
    this.fieldsForCopy.push(`${fixed} = ${fixed}`);
    this.setFieldsToDefaults.push(`var ${fixed} = ${defaultVal}`);

    this.decode.push(`"${field}" -> {`,
                     `    decoder.validate("${typeName[0]}")`,
                     `    ${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeName[0]}", ${fixed}) }`);

    this.fieldsForToString.push(`${fixed} = $${fixed}`);
    if (isCollection) {
      this.collectionSchemaFields.push(`"${field}" to ${schemaType}`);
    } else {
      this.singletonSchemaFields.push(`"${field}" to ${schemaType}`);
    }
  }

  createSchema(schemaHash: string): string {
    const schemaNames = this.node.schema.names.map(n => `SchemaName("${n}")`);
    return `\
Schema(
    setOf(${ktUtils.joinWithIndents(schemaNames, 8)}),
    SchemaFields(
        singletons = ${leftPad(ktUtils.mapOf(this.singletonSchemaFields, 30), 8, true)},
        collections = ${leftPad(ktUtils.mapOf(this.collectionSchemaFields, 30), 8, true)}
    ),
    ${quote(schemaHash)},
    refinement = ${this.refinement},
    query = ${this.query}
)`;
  }

  typeFor(name: string): string {
    return getTypeInfo({name}).type;
  }

  defaultValFor(name: string): string {
    return getTypeInfo({name}).defaultVal;
  }

  generatePredicates() {
    const expression = KTExtracter.fromSchema(this.node.schema, this);
    const refinement = this.node.schema.refinement;
    const queryType = refinement.getQueryParams().get('?');
    const lines = leftPad(expression, 8);
    if (queryType) {
      this.query = `{ data, queryArgs ->
${lines}
    }`;
    } else {
      this.refinement = `{ data ->
${lines}
    }`;
    }
  }

  generate(schemaHash: string, fieldCount: number): string { return ''; }

  generateAliases(particleName: string): string {
    const name = this.node.kotlinName;
    const aliases = this.node.kotlinAliases
    const typeDecls = aliases.map(alias => `typealias ${alias} = ${particleName}.${name}`);
    return `${typeDecls.length ? typeDecls.join('\n') : ''}`;
  }

  generateClasses(schemaHash: string, fieldCount: number): string {
    const name = this.node.kotlinName;

    const withFields = (populate: string) => fieldCount === 0 ? '' : populate;
    const withoutFields = (populate: string) => fieldCount === 0 ? populate : '';

    const classDef = `\
@Suppress("UNCHECKED_CAST")
class ${name}(`;
    const baseClass = this.opts.wasm
        ? 'WasmEntity'
        : ktUtils.applyFun('EntityBase', [quote(name), 'SCHEMA', 'entityId', 'expirationTimestamp', 'creationTimestamp']);
    const classInterface = `) : ${baseClass} {`;

    const constructorFields = this.fields.concat(this.opts.wasm ? [] : [
      'entityId: String? = null',
      'expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP',
      'creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP',
    ]);

    const fieldsForMutate = this.fieldsForCopy.concat(this.opts.wasm ? [] : [
      'entityId = entityId',
      'expirationTimestamp = expirationTimestamp',
      'creationTimestamp = creationTimestamp'
    ]);

    const constructorArguments =
      ktUtils.joinWithIndents(constructorFields, classDef.length+classInterface.length, 1);

    return `\

${classDef}${constructorArguments}${classInterface}

    ${withFields(`${this.fieldVals.join('\n    ')}`)}

    ${this.opts.wasm ? `override var entityId = ""` : withFields(`init {
        ${this.fieldInitializers.join('\n        ')}
    }`)}
    ${this.opts.wasm ? `` : `/**
     * Use this method to create a new, distinctly identified copy of the entity. 
     * Storing the copy will result in a new copy of the data being stored.
     */`}
    fun copy(${ktUtils.joinWithIndents(this.fieldsForCopyDecl, 14, 2)}) = ${name}(${ktUtils.joinWithIndents(this.fieldsForCopy, 8+name.length, 2)})
    ${this.opts.wasm ? `` : `/** 
     * Use this method to create a new version of an existing entity.
     * Storing the mutation will overwrite the existing entity in the set, if it exists.
     */
    fun mutate(${ktUtils.joinWithIndents(this.fieldsForCopyDecl, 14, 2)}) = ${name}(${ktUtils.joinWithIndents(fieldsForMutate, 8+name.length, 2)})`}
${this.opts.wasm ? `
    fun reset() {
      ${withFields(`${this.fieldsReset.join('\n        ')}`)}
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", entityId)
        ${this.encode.join('\n        ')}
        return encoder.toNullTermByteArray()
    }

    override fun toString() =
        "${name}(${this.fieldsForToString.join(', ')})"
` : ''}
    companion object : ${this.prefixTypeForRuntime('EntitySpec')}<${name}> {
        ${this.opts.wasm ? '' : `
        override val SCHEMA = ${leftPad(this.createSchema(schemaHash), 8, true)}

        init {
            SchemaRegistry.register(this)
        }`}
        ${!this.opts.wasm ? `
        override fun deserialize(data: RawEntity) = ${name}().apply { deserialize(data) }` : `
        override fun decode(encoded: ByteArray): ${name}? {
            if (encoded.isEmpty()) return null

            val decoder = StringDecoder(encoded)
            val entityId = decoder.decodeText()
            decoder.validate("|")
            ${withFields(`
            ${this.setFieldsToDefaults.join('\n            ')}
            var i = 0
            while (i < ${fieldCount} && !decoder.done()) {
                val _name = decoder.upTo(':').toUtf8String()
                when (_name) {
                    ${this.decode.join('\n                    ')}
                    else -> {
                        // Ignore unknown fields until type slicing is fully implemented.
                        when (decoder.chomp(1).toUtf8String()) {
                            "T", "U" -> decoder.decodeText()
                            "N" -> decoder.decodeNum()
                            "B" -> decoder.decodeBool()
                        }
                        i--
                    }
                }
                decoder.validate("|")
                i++
            }`)}
            val _rtn = ${name}().copy(
                ${ktUtils.joinWithIndents(this.fieldsForCopy, 33, 3)}
            )
            _rtn.entityId = entityId
            return _rtn
        }`}
    }
}`;
  }

  private prefixTypeForRuntime(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : `${type}`;
  }
}
