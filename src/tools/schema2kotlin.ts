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
  'suspend', 'tailrec', 'vararg', 'field', 'it', 'internalId'
];

const typeMap = {
  'T': {type: 'String', decodeFn: 'decodeText()'},
  'U': {type: 'String', decodeFn: 'decodeText()'},
  'N': {type: 'Double', decodeFn: 'decodeNum()'},
  'B': {type: 'Boolean', decodeFn: 'decodeBool()'},
  'R': {type: '', decodeFn: ''},
};

export class Schema2Kotlin extends Schema2Base {
  // test-KOTLIN.file_Name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(outName: string): string {
    const withCustomPackage = (populate: string) => this.scope !== 'arcs' ? populate : '';
    return `\
@file:Suppress("PackageName", "TopLevelName")
package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

${withCustomPackage(`import arcs.Particle
import arcs.NullTermByteArray
import arcs.Entity
import arcs.StringEncoder
import arcs.StringDecoder
import arcs.utf8ToString
`)}`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node);
  }
}

class KotlinGenerator implements ClassGenerator {
  fields: string[] = [];
  encode: string[] = [];
  decode: string[] = [];

  constructor(readonly node: SchemaNode) {}

  addField(field: string, typeChar: string) {
    const {type, decodeFn} = typeMap[typeChar];
    const fixed = field + (keywords.includes(field) ? '_' : '');

    this.fields.push(`var ${fixed}: ${type}`);

    this.decode.push(`"${field}" -> {`,
                     `  decoder.validate("${typeChar}")`,
                     `  this.${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeChar}", it) }`);
  }

  addReference(field: string, refName: string) {
    // TODO: support reference types in kotlin
  }

  generate(fieldCount: number): string {
    const {name, aliases} = this.node;

    let typeDecls = '';
    if (aliases.length) {
      typeDecls = '\n' + aliases.map(a => `typealias ${a} = ${name}`).join('\n') + '\n';
    }

    const withFields = (populate: string) => fieldCount === 0 ? '' : populate;
    const withoutFields = (populate: string) => fieldCount === 0 ? populate : '';

    return `\

${withFields('data ')}class ${name}(${ withFields(`\n  ${this.fields.join(',\n  ')}\n`) }) : Entity<${name}>() {

  override fun decodeEntity(encoded: ByteArray): ${name}? {
    if (encoded.isEmpty()) return null

    val decoder = StringDecoder(encoded)
    internalId = decoder.decodeText()
    decoder.validate("|")
    ${withFields(`  for (_i in 0 until ${fieldCount}) {
         if (decoder.done()) break
         val name = decoder.upTo(':').utf8ToString()
         when (name) {
           ${this.decode.join('\n           ')}
         }
         decoder.validate("|")
        }
   `)}

    return this
  }

  override fun encodeEntity(): NullTermByteArray {
    val encoder = StringEncoder()
    encoder.encode("", internalId)
    ${this.encode.join('\n    ')}
    return encoder.toNullTermByteArray()
  }
  ${withoutFields(`
  override fun toString(): String {
    return "${name}()"
  }`)}
}
${typeDecls}
`;
  }
}
