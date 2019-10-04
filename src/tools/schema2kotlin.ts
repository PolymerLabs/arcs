/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema2Base} from './schema2base.js';
import {Schema} from '../runtime/schema.js';

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
  // test-Kotlin.file_name.arcs -> TestKotlinFileName.kt
  outputName(baseName: string): string {
    const parts = baseName.toLowerCase().replace(/\.arcs$/, '').split(/[-._]/);
    return parts.map(part => part[0].toUpperCase() + part.slice(1)).join('') + '.kt';
  }

  fileHeader(outName: string): string {
    return `\
package arcs

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection
`;
  }

  fileFooter(): string {
    return '';
  }

  entityClass(name: string, schema: Schema): string {
    const fields: string[] = [];
    const encode: string[] = [];
    const decode: string[] = [];

    const fieldCount = this.processSchema(schema, (field: string, typeChar: string, refName: string) => {
      if (typeChar === 'R') {
        console.log('TODO: support reference types in kotlin');
        process.exit(1);
      }

      const {type, defaultVal, decodeFn} = typeMap[typeChar];
      const fixed = field + (keywords.includes(field) ? '_' : '');

      fields.push(`var ${fixed}: ${type} = ${defaultVal}`);

      decode.push(`"${field}" -> {`,
                  `  decoder.validate("${typeChar}")`,
                  `  this.${fixed} = decoder.${decodeFn}`,
                  `}`,
      );

      encode.push(`encoder.encode("${field}:${typeChar}", ${fixed})`);
    });

    return `\

data class ${name}(
  ${fields.join(', ')}
) : Entity<${name}>() {
  override fun decodeEntity(encoded: String): ${name}? {
    if (encoded.isEmpty()) {
      return null
    }
    val decoder = StringDecoder(encoded)
    this.internalId = decoder.decodeText()
    decoder.validate("|")
    var i = 0
    while (!decoder.done() && i < ${fieldCount}) {
      val name = decoder.upTo(":")
      when (name) {
        ${decode.join('\n        ')}
      }
      decoder.validate("|")
      i++
    }
    return this
  }

  override fun encodeEntity(): String {
    val encoder = StringEncoder()
    encoder.encode("", internalId)
    ${encode.join('\n    ')}
    return encoder.result()
  }
}
`;
  }
}
