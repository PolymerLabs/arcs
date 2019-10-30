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
const keywords = [
  'as', 'as?', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', '!in', 'interface', 'is',
  '!is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var',
  'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import',
  'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where', 'actual', 'abstract', 'annotation', 'companion',
  'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal',
  'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed',
  'suspend', 'tailrec', 'vararg', 'field', 'it'
];

const typeMap = {
  'T': {type: 'String',  defaultVal: '""',    decodeFn: 'decodeText()'},
  'U': {type: 'String',  defaultVal: '""',    decodeFn: 'decodeText()'},
  'N': {type: 'Double',  defaultVal: '0.0',   decodeFn: 'decodeNum()'},
  'B': {type: 'Boolean', defaultVal: 'false', decodeFn: 'decodeBool()'},
  'R': {type: '',        defaultVal: '',      decodeFn: ''},
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
package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support references or optional field detection

${withCustomPackage(`import arcs.Particle;
import arcs.Entity
import arcs.StringEncoder
import arcs.StringDecoder
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

  processField(field: string, typeChar: string, inherited: boolean, refName: string) {
    if (typeChar === 'R') {
      console.log('TODO: support reference types in kotlin');
      process.exit(1);
    }

    const {type, defaultVal, decodeFn} = typeMap[typeChar];
    const fixed = field + (keywords.includes(field) ? '_' : '');

    this.fields.push(`var ${fixed}: ${type} = ${defaultVal}`);

    this.decode.push(`"${field}" -> {`,
                     `  decoder.validate("${typeChar}")`,
                     `  this.${fixed} = decoder.${decodeFn}`,
                     `}`);

    this.encode.push(`encoder.encode("${field}:${typeChar}", ${fixed})`);
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

  override fun decodeEntity(encoded: String): ${name}? {
    if (encoded.isEmpty()) return null
    
    val decoder = StringDecoder(encoded)
    internalId = decoder.decodeText()
    decoder.validate("|")
    ${withFields(`0.until(${fieldCount}).takeWhile { _ -> !decoder.done() }
     .forEach {
      val name = decoder.upTo(":")
      when (name) {
        ${this.decode.join('\n        ')}
      }
      decoder.validate("|")
     }`)}
    return this
  }

  override fun encodeEntity(): String {
    val encoder = StringEncoder()
    encoder.encode("", internalId)
    ${this.encode.join('\n    ')}
    return encoder.result()
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
