/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base, ClassGenerator, AddFieldOptions} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {ParticleSpec, HandleConnectionSpec} from '../runtime/particle-spec.js';
import {EntityType, CollectionType} from '../runtime/type.js';
import {KTExtracter} from '../runtime/refiner.js';
import {Dictionary} from '../runtime/hot.js';
import minimist from 'minimist';
import {KotlinGenerationUtils, leftPad, quote} from './kotlin-generation-utils.js';

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
  'suspend', 'tailrec', 'vararg', 'it', 'internalId'
];

export interface KotlinTypeInfo {
  type: string;
  decodeFn: string;
  defaultVal: string;
  schemaType: string;
}

const typeMap: Dictionary<KotlinTypeInfo> = {
  'Text': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
  'URL': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
  'Number': {type: 'Double',  decodeFn: 'decodeNum()',  defaultVal: '0.0', schemaType: 'FieldType.Number'},
  'Boolean': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false', schemaType: 'FieldType.Boolean'},
};

function getTypeInfo(name: string): KotlinTypeInfo {
  const info = typeMap[name];
  if (!info) {
    throw new Error(`Unhandled type '${name}' for kotlin.`);
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
    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

import arcs.sdk.*
${this.opts.wasm ?
      `import arcs.sdk.wasm.*` :
      `\
import arcs.sdk.Entity
import arcs.core.data.*
import arcs.core.data.util.toReferencable
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.api.toPrimitiveValue`}
`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node, this.opts);
  }

  generateParticleClass(particle: ParticleSpec): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    const specDecls: string[] = [];

    for (const connection of particle.connections) {
      const handleName = connection.name;
      const entityType = `${particleName}_${this.upperFirst(connection.name)}`;
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
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} = ${this.prefixTypeForRuntime(handleConcreteType) + 'Impl'}(particle, "${handleName}", ${entityType}_Spec())`);
      } else {
        specDecls.push(`"${handleName}" to ${entityType}_Spec()`);
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} by handles`);
      }

    }
    return `
${this.getHandlesClassDecl(particleName, specDecls)} {
    ${handleDecls.join('\n    ')}
}

abstract class Abstract${particleName} : ${this.opts.wasm ? 'WasmParticleImpl' : 'BaseParticle'}() {
    ${this.opts.wasm ? '' : 'override '}val handles: ${particleName}Handles = ${particleName}Handles(${this.opts.wasm ? 'this' : ''})
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
    return getTypeInfo(type).type;
  }

  private getHandlesClassDecl(particleName: string, entitySpecs: string[]): string {
    if (this.opts.wasm) {
      return `class ${particleName}Handles(
    particle: WasmParticleImpl
)`;
    } else {
      return `class ${particleName}Handles : HandleHolderBase(
    "${particleName}",
    mapOf(${ktUtils.joinWithIndents(entitySpecs, 8, 2)})
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
  fieldsForCopyDecl: string[] = [];
  fieldsForCopy: string[] = [];
  setFieldsToDefaults: string[] = [];
  fieldSerializes: string[] = [];
  fieldDeserializes: string[] = [];
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
  addField({field, typeName, refClassName, isOptional = false, isCollection = false}: AddFieldOptions) {
    // TODO: support reference types in kotlin
    if (typeName === 'Reference') return;

    const {type, decodeFn, defaultVal} = getTypeInfo(typeName);
    const fixed = this.escapeIdentifier(field);

    this.fields.push(`${fixed}: ${type} = ${defaultVal}`);
    this.fieldVals.push(
      `var ${fixed} = ${fixed}\n` +
      `        get() = field\n` +
      `        private set(_value) {\n` +
      `            field = _value\n` +
      `        }`
    );
    this.fieldsReset.push(
      `${fixed} = ${defaultVal}`,
    );
    this.fieldsForCopyDecl.push(`${fixed}: ${type} = this.${fixed}`);
    this.fieldsForCopy.push(`${fixed} = ${fixed}`);
    this.setFieldsToDefaults.push(`var ${fixed} = ${defaultVal}`);

    this.decode.push(`"${field}" -> {`,
                     `    decoder.validate("${typeName[0]}")`,
                     `    ${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeName[0]}", ${fixed}) }`);

    this.fieldSerializes.push(`"${field}" to ${fixed}.toReferencable()`);
    this.fieldDeserializes.push(`${fixed} = data.singletons["${fixed}"].toPrimitiveValue(${type}::class, ${defaultVal})`);
    this.fieldsForToString.push(`${fixed} = $${fixed}`);
    if (isCollection) {
      this.collectionSchemaFields.push(`"${field}" to ${getTypeInfo(typeName).schemaType}`);
    } else {
      this.singletonSchemaFields.push(`"${field}" to ${getTypeInfo(typeName).schemaType}`);
    }
  }

  createSchema(schemaHash: string): string {
    const schemaNames = this.node.schema.names.map(n => `SchemaName("${n}")`);
    return `\
Schema(
    listOf(${ktUtils.joinWithIndents(schemaNames, 8)}),
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
    return getTypeInfo(name).type;
  }

  defaultValFor(name: string): string {
    return getTypeInfo(name).defaultVal;
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

  generate(schemaHash: string, fieldCount: number): string {
    const {name, aliases} = this.node;

    const typeDecls: string[] = [];
    aliases.forEach(alias => {
      typeDecls.push(
          `typealias ${alias} = ${name}`,
          `typealias ${alias}_Spec = ${name}_Spec`);
    });

    const withFields = (populate: string) => fieldCount === 0 ? '' : populate;
    const withoutFields = (populate: string) => fieldCount === 0 ? populate : '';

    const classDef = `class ${name}(`;
    const classInterface = `) : ${this.prefixTypeForRuntime('Entity')} {`;

    const constructorArguments =
      withFields(ktUtils.joinWithIndents(this.fields, classDef.length+classInterface.length, 1));

    return `\

${classDef}${constructorArguments}${classInterface}

    override var internalId = ""

    ${withFields(`${this.fieldVals.join('\n    ')}`)}

    fun copy(${ktUtils.joinWithIndents(this.fieldsForCopyDecl, 14, 2)}) = ${name}(${ktUtils.joinWithIndents(this.fieldsForCopy, 8+name.length, 2)})

    fun reset() {
        ${withFields(`${this.fieldsReset.join('\n        ')}`)}
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) {
            return true
        }

        if (other is ${name}) {
            if (internalId.isNotEmpty()) {
                return internalId == other.internalId
            }
            return toString() == other.toString()
       }
        return false;
    }

    override fun hashCode(): Int =
        if (internalId.isNotEmpty()) internalId.hashCode() else toString().hashCode()

    override fun schemaHash() = "${schemaHash}"
${this.opts.wasm ? `
    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        ${this.encode.join('\n        ')}
        return encoder.toNullTermByteArray()
    }` : `
    override fun serialize() = RawEntity(
        internalId,
        mapOf(${ktUtils.joinWithIndents(this.fieldSerializes, 15, 3)})
    )`}

    override fun toString() =
      "${name}(${this.fieldsForToString.join(', ')})"
}

class ${name}_Spec() : ${this.prefixTypeForRuntime('EntitySpec')}<${name}> {

    override fun create() = ${name}()
    ${!this.opts.wasm ? `
    override fun deserialize(data: RawEntity): ${name} {
        // TODO: only handles singletons for now
        val rtn = create().copy(${withFields(`${ktUtils.joinWithIndents(this.fieldDeserializes, 32, 3)}`)})
        rtn.internalId = data.id
        return rtn
    }` : ''}
${this.opts.wasm ? `
    override fun decode(encoded: ByteArray): ${name}? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        val internalId = decoder.decodeText()
        decoder.validate("|")
        ${withFields(`
        ${this.setFieldsToDefaults.join('\n        ')}
        var i = 0
        while (i < ${fieldCount} && !decoder.done()) {
            val _name = decoder.upTo(':').toUtf8String()
            when (_name) {
                ${this.decode.join('\n                ')}
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
        val _rtn = create().copy(
            ${ktUtils.joinWithIndents(this.fieldsForCopy, 33, 3)}
        )
        _rtn.internalId = internalId
        return _rtn
    }` : ''}${this.opts.wasm ? '' : `
    override fun schema() = SCHEMA

    companion object {
        val SCHEMA = ${leftPad(this.createSchema(schemaHash), 8, true)}

        init {
            SchemaRegistry.register(SCHEMA)
        }
    }`}
}

${typeDecls.length ? typeDecls.join('\n') + '\n' : ''}`;
  }

  private prefixTypeForRuntime(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : `${type}`;
  }
}
