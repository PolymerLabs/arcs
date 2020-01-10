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
  'T': {type: 'String', decodeFn: 'decodeText()', defaultVal: `""`},
  'U': {type: 'String', decodeFn: 'decodeText()', defaultVal: `""`},
  'N': {type: 'Double', decodeFn: 'decodeNum()', defaultVal: '0.0'},
  'B': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false'},
  'R': {type: '', decodeFn: '', defaultVal: ''},
};

export class Schema2Kotlin extends Schema2Base {
  // test-KOTLIN.file_Name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(outName: string): string {
    const withCustomPackage = (populate: string) => this.scope !== 'arcs.sdk' ? populate : '';
    return `\
@file:Suppress("PackageName", "TopLevelName")
package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

${withCustomPackage(`import arcs.sdk.Entity
import arcs.sdk.Collection
import arcs.sdk.NullTermByteArray
import arcs.sdk.Particle
import arcs.sdk.Singleton
import arcs.sdk.StringDecoder
import arcs.sdk.StringEncoder
import arcs.sdk.utf8ToString
`)}`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node);
  }

  generateParticleClass(particle: ParticleSpec): string {
    const particleName = particle.name;
    const handleDecls: string[] = [];
    for (const connection of particle.connections) {
      const handleName = connection.name;
      const handleType = connection.type.isCollectionType() ? 'Collection' : 'Singleton';
      const entityType = `${particleName}_${this.upperFirst(connection.name)}`;
      handleDecls.push(`protected val ${handleName} = ${handleType}(this, "${handleName}") { ${entityType}() }`);
    }
    return `
abstract class Abstract${particleName} : Particle() {
    ${handleDecls.join('\n    ')}
}
`;
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

  constructor(readonly node: SchemaNode) {}

  addField(field: string, typeChar: string) {
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

  addReference(field: string, refName: string) {
    // TODO: support reference types in kotlin
  }

  generate(schemaHash: string, fieldCount: number): string {
    const {name, aliases} = this.node;

    let typeDecls = '';
    if (aliases.length) {
      typeDecls = '\n' + aliases.map(a => `typealias ${a} = ${name}`).join('\n') + '\n';
    }

    const withFields = (populate: string) => fieldCount === 0 ? '' : populate;
    const withoutFields = (populate: string) => fieldCount === 0 ? populate : '';

    return `\

class ${name}() : Entity<${name}>() {

    ${ withFields(`${this.fieldVals.join('\n    ')}`) }

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

    override fun decodeEntity(encoded: ByteArray): ${name}? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        this.reset()
        ${withFields(`for (_i in 0 until ${fieldCount}) {
            if (decoder.done()) break
            val name = decoder.upTo(':').utf8ToString()
            when (name) {
                ${this.decode.join('\n                ')}
            }
            decoder.validate("|")
        }`)}
        return this
    }

    override fun encodeEntity(): NullTermByteArray {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        ${this.encode.join('\n        ')}
        return encoder.toNullTermByteArray()
    }
}
${typeDecls}`;
  }
}
