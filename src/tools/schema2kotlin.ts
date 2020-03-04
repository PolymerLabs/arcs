/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base, ClassGenerator} from './schema2base.js';
import {SchemaNode} from './schema2graph.js';
import {ParticleSpec} from '../runtime/particle-spec.js';
import minimist from 'minimist';
import {UnifiedStore} from '../runtime/storageNG/unified-store.js';

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

const typeMap = {
  'T': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
  'U': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`, schemaType: 'FieldType.Text'},
  'N': {type: 'Double',  decodeFn: 'decodeNum()',  defaultVal: '0.0', schemaType: 'FieldType.Number'},
  'B': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false', schemaType: 'FieldType.Boolean'},
};

export class Schema2Kotlin extends Schema2Base {
  // test-KOTLIN.file_Name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(outName: string): string {
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
        handleInterfaceType = `Wasm${handleConcreteType}Impl<${entityType}>`;
      } else {
        switch (connection.direction) {
          case 'reads writes':
            handleInterfaceType = `ReadWrite${handleConcreteType}<${entityType}>`;
            break;
          case 'writes':
            handleInterfaceType = `Writable${handleConcreteType}<${entityType}>`;
            break;
          case 'reads':
            handleInterfaceType = `Readable${handleConcreteType}<${entityType}>`;
            break;
          default:
            throw new Error(`Unsupported handle direction: ${connection.direction}`);
        }
      }
      if (this.opts.wasm) {
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} = ${this.getType(handleConcreteType) + 'Impl'}(particle, "${handleName}", ${entityType}_Spec())`);
      } else {
        specDecls.push(`"${handleName}" to ${entityType}_Spec()`);
        handleDecls.push(`val ${handleName}: ${handleInterfaceType} by handles`);
      }

    }
    return `
class ${particleName}Handles(
   ${this.getBaseParticleDecl()}
) ${this.getExtendsClause(specDecls, particleName)} {
    ${handleDecls.join('\n    ')} 
}

abstract class Abstract${particleName} : ${this.opts.wasm ? 'WasmParticleImpl' : 'BaseParticle'}() {
    ${this.opts.wasm ? '' : 'override '}val handles: ${particleName}Handles = ${particleName}Handles(${this.opts.wasm ? 'this' : ''})
}
`;
  }

  private getExtendsClause(entitySpecs, particleName): string {
    return this.opts.wasm ? '' : `: HandleHolderBase(
        mutableMapOf<String, Handle>().withDefault { 
            key -> throw NoSuchElementException("Handle $key not initialized in ${particleName}")
        },
        mapOf(
            ${entitySpecs.join(',\n            ')}
        )
    )`;
  }

  private getBaseParticleDecl(): string {
    return this.opts.wasm ? 'particle: WasmParticleImpl' : '';
  }

  private getType(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : type;
  }
}

export class KotlinGenerator implements ClassGenerator {
  fields: string[] = [];
  fieldVals: string[] = [];
  setFields: string[] = [];
  encode: string[] = [];
  decode: string[] = [];
  fieldsReset: string[] = [];
  getUnsetFields: string[] = [];
  fieldsForCopyDecl: string[] = [];
  fieldsForCopy: string[] = [];
  setFieldsToDefaults: string[] = [];
  fieldSerializes: string[] = [];
  fieldDeserializes: string[] = [];
  fieldsForToString: string[] = [];
  singletonSchemaFields: string[] = [];
  collectionSchemaFields: string[] = [];

  public schemaRegistry: string[];

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {}

  // TODO: allow optional fields in kotlin
  addField(field: string, typeChar: string, isOptional: boolean, refClassName: string|null, isCollection: boolean = false) {
    // TODO: support reference types in kotlin
    if (typeChar === 'R') return;

    const {type, decodeFn, defaultVal} = typeMap[typeChar];
    const fixed = field + (keywords.includes(field) ? '_' : '');

    this.fields.push(`${fixed}: ${type} = ${defaultVal}`);
    this.fieldVals.push(
      `var ${fixed} = ${defaultVal}\n` +
      `        get() = field\n` +
      `        private set(_value) {\n` +
      `            field = _value\n` +
      `        }`
    );
    this.setFields.push(`this.${fixed} = ${fixed}`);
    this.fieldsReset.push(
      `${fixed} = ${defaultVal}`,
    );
    this.fieldsForCopyDecl.push(`${fixed}: ${type} = this.${fixed}`);
    this.fieldsForCopy.push(`${fixed} = ${fixed}`);
    this.setFieldsToDefaults.push(`var ${fixed} = ${defaultVal}`);

    this.decode.push(`"${field}" -> {`,
                     `    decoder.validate("${typeChar}")`,
                     `    ${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeChar}", ${fixed}) }`);

    this.fieldSerializes.push(`"${field}" to ${fixed}.toReferencable()`);
    this.fieldDeserializes.push(`${fixed} = data.singletons["${fixed}"].toPrimitiveValue(${type}::class, ${defaultVal})`);
    this.fieldsForToString.push(`${fixed} = $${fixed}`);
    if (isCollection) {
      this.collectionSchemaFields.push(`"${field}" to ${typeMap[typeChar].schemaType}`);
    } else {
      this.singletonSchemaFields.push(`"${field}" to ${typeMap[typeChar].schemaType}`);
    }

  }

  mapOf(items: string[]): string {
    switch (items.length) {
      case 0:
        return `emptyMap()`;
      case 1:
        return `mapOf(${items[0]})`;
      default:
        return `\
mapOf(
${this.leftPad(items.join(',\n'), 4)}
)`;
    }

  }

  createSchema(schemaHash: string): string {
    const schemaNames = this.node.schema.names.map(n => `SchemaName("${n}")`);
    return `\
Schema(
    listOf(${schemaNames.join(',\n' + ' '.repeat(8))}),
    SchemaFields(
        singletons = ${this.leftPad(this.mapOf(this.singletonSchemaFields), 8, true)},
        collections = ${this.leftPad(this.mapOf(this.collectionSchemaFields), 8, true)}
    ),
    "${schemaHash}"
)`;
  }

  leftPad(input: string, indent: number, skipFirst: boolean = false) {
    return input
      .split('\n')
      .map((line: string, idx: number) => (idx === 0 && skipFirst) ? line : ' '.repeat(indent) + line)
      .join('\n');
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

    return `\

class ${name}() : ${this.getType('Entity')} {

    override var internalId = ""

    ${withFields(`${this.fieldVals.join('\n    ')}`)}

    ${withFields(`constructor(
        ${this.fields.join(',\n        ')}
    ) : this() {
        ${this.setFields.join('\n        ')}
    }`)}

    fun copy(
        ${this.fieldsForCopyDecl.join(',\n        ')}
    ) = ${name}(
        ${this.fieldsForCopy.join(', \n        ')}
    )

    fun reset() {
        ${withFields(`${this.fieldsReset.join('\n        ')}`)}
    }

    override fun equals(other: Any?): Boolean {
      if (this === other) {
        return true
      }
      
      if (other is ${name}) {
        if (internalId != "") {
          return internalId == other.internalId
        }
        return toString() == other.toString()
      }  
      return false;
    }
    
    override fun hashCode(): Int =
      if (internalId != "") internalId.hashCode() else toString().hashCode()
        
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
        mapOf(
            ${this.fieldSerializes.join(',\n            ')}
        )
    )`}

    override fun toString() = "${name}(${this.fieldsForToString.join(', ')})"
}

class ${name}_Spec() : ${this.getType('EntitySpec')}<${name}> {
${this.opts.wasm ? '' : `\

    companion object {
        val schema = ${this.leftPad(this.createSchema(schemaHash), 12, true)}
        
        init {
            SchemaRegistry.register(schema)
        }
    }
`}
    override fun create() = ${name}()
    ${!this.opts.wasm ? `
    override fun deserialize(data: RawEntity): ${name} {
      // TODO: only handles singletons for now
      val rtn = create().copy(
        ${withFields(`${this.fieldDeserializes.join(', \n        ')}`)}
      )
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
            ${this.fieldsForCopy.join(', \n            ')}
        )
        _rtn.internalId = internalId
        return _rtn
    }` : ''}
}

${typeDecls.length ? typeDecls.join('\n') + '\n' : ''}`;
  }

  private getType(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : `${type}`;
  }
}
