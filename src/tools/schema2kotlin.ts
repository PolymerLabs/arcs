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
  'T': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`},
  'U': {type: 'String',  decodeFn: 'decodeText()', defaultVal: `""`},
  'N': {type: 'Double',  decodeFn: 'decodeNum()',  defaultVal: '0.0'},
  'B': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false'},
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
${this.opts.wasm ? 'import arcs.sdk.wasm.*' : ''}
`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node, this.opts);
  }

  generateParticleClass(particle: ParticleSpec): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    for (const connection of particle.connections) {
      const handleName = connection.name;
      const entityType = `${particleName}_${this.upperFirst(connection.name)}`;
      const handleConcreteType = connection.type.isCollectionType() ? 'Collection' : 'Singleton';
      let handleInterfaceType: string;
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
      handleDecls.push(`protected val ${handleName}: ${handleInterfaceType} = ${this.getType(handleConcreteType) + 'Impl'}(this, "${handleName}", ${entityType}_Spec())`);
    }
    return `
abstract class Abstract${particleName} : ${this.opts.wasm ? 'WasmParticleImpl' : 'BaseParticle'}() {
    ${handleDecls.join('\n    ')}
}
`;
  }

  private getType(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : type;
  }
}

class KotlinGenerator implements ClassGenerator {
  fields: string[] = [];
  fieldVals: string[] = [];
  setFields: string[] = [];
  fieldSets: string[] = [];
  encode: string[] = [];
  decode: string[] = [];
  fieldsReset: string[] = [];
  getUnsetFields: string[] = [];

  constructor(readonly node: SchemaNode, private readonly opts: minimist.ParsedArgs) {}

  // TODO: allow optional fields in kotlin
  addField(field: string, typeChar: string, isOptional: boolean, refClassName: string|null) {
    // TODO: support reference types in kotlin
    if (typeChar === 'R') return;

    const {type, decodeFn, defaultVal} = typeMap[typeChar];
    const fixed = field + (keywords.includes(field) ? '_' : '');
    const set = `_${fixed}Set`;

    this.fields.push(`${fixed}: ${type}`);
    this.fieldVals.push(
      `var ${set} = false\n` +
      `    var ${fixed} = ${defaultVal}\n` +
      `        get() = field\n` +
      `        set(value) {\n` +
      `            field = value\n` +
      `            ${set} = true\n` +
      `        }`
    );
    this.setFields.push(`this.${fixed} = ${fixed}`);
    this.fieldSets.push(`${set}`);
    this.fieldsReset.push(
      `${fixed} = ${defaultVal}`,
      `${set} = false`
    );
    this.getUnsetFields.push(`if (!${set}) rtn.add("${fixed}")`);

    this.decode.push(`"${field}" -> {`,
                     `    decoder.validate("${typeChar}")`,
                     `    this.${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeChar}", ${fixed}) }`);
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

    override fun isSet(): Boolean {
        return ${withFields(`${this.fieldSets.join(' && ')}`)}${withoutFields('true')}
    }

    fun reset() {
        ${withFields(`${this.fieldsReset.join('\n        ')}`)}
    }

    override fun getFieldsNotSet(): List<String> {
        val rtn = mutableListOf<String>()
        ${withFields(this.getUnsetFields.join('\n        '))}
        return rtn
    }

    override fun schemaHash() = "${schemaHash}"
${this.opts.wasm ? `
    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        ${this.encode.join('\n        ')}
        return encoder.toNullTermByteArray()
    }` : ''}
}

class ${name}_Spec() : ${this.getType('EntitySpec')}<${name}> {

    override fun create() = ${name}()
${this.opts.wasm ? `
    override fun decode(encoded: ByteArray): ${name}? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        return create().apply {
            internalId = decoder.decodeText()
            decoder.validate("|")
            ${withFields(`var i = 0
            while (i < ${fieldCount} && !decoder.done()) {
                val name = decoder.upTo(':').toUtf8String()
                when (name) {
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
        }
    }` : ''}
}

${typeDecls.length ? typeDecls.join('\n') + '\n' : ''}`;
  }

  private getType(type: string): string {
    return this.opts.wasm ? `Wasm${type}` : type;
  }
}
