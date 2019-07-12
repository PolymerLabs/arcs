/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


const description = `Generates Kotlin code from Schemas for use in wasm particles.`;

import {Schema2Base, typeSummary} from './schema2base.js';


// https://kotlinlang.org/docs/reference/keyword-reference.html
// var keywords = [...document.getElementsByTagName('code')].map((x) => x.innerHTML);
const keywords = [
  'as', 'as?', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', '!in', 'interface', 'is',
  '!is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var',
  'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import',
  'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where', 'actual', 'abstract', 'annotation', 'companion',
  'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal',
  'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed',
  'suspend', 'tailrec', 'vararg', 'field', 'it'
];

function leftPad(block: string, n: number = 0) {
  return block.split('\n')
    .map((line) => `${' '.repeat(n)}${line}`)
    .join('\n');
}

function generate(name: string, schema): string {
  const fields: string[] = [];
  const encode: string[] = [];
  const decode: string[] = [];

  const processValue = (field, typeChar): void => {
    const typeMap = {
      'T': ['String', '""'],
      'U': ['String', '""'],
      'N': ['Double', '0.0'],
      'B': ['Boolean', 'false'],
    };

    const decodeMap = {
      'T': 'decodeText()',
      'U': 'decodeText()',
      'N': 'decodeNum()',
      'B': 'decodeBool()'
    };
    const type = typeMap[typeChar][0];
    const defaultVal = typeMap[typeChar][1];
    const decodeType = typeMap[typeChar];

    const fixed = field + (keywords.includes(field) ? '_' : '');

    fields.push(`var ${fixed}: ${type} = ${defaultVal}`);


    decode.push(`"${fixed}" -> {`,
      `     decoder.validate("${typeChar}")`,
      `     ${fixed} = decoder.${decodeType}`,
      `}`,
    );

    encode.push(`encoder.encode("${fixed}:${typeChar}", ${fixed})`);
  };

  let fieldCount = 0;
  for (const [field, descriptor] of Object.entries(schema.fields)) {
    fieldCount++;
    switch (typeSummary(descriptor)) {
      case 'schema-primitive:Text':
        processValue(field, 'T');
        break;

      case 'schema-primitive:URL':
        processValue(field, 'U');
        break;

      case 'schema-primitive:Number':
        processValue(field, 'N');
        break;

      case 'schema-primitive:Boolean':
        processValue(field, 'B');
        break;

      default:
        console.error(`Schema type for field '${field}' is not yet supported:`);
        console.dir(descriptor, {depth: null});
        process.exit(1);

    }
  }

  const content =
  `\
    package arcs

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

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
${leftPad(decode.join('\n'), 8)}
      }
      decoder.validate("|")
      i++
    }
    return this
  }

  override fun encodeEntity(): String {
    val encoder = StringEncoder()
    encoder.encode("", internalId)
${leftPad(encode.join('\n'), 4)}
    return encoder.result()
  }
}`
;

  // Post-process whole file
  return content.replace(/ +\n/g, '\n');
}

function titleCase(variable: string): string {
  if (variable === '') {
    return '';
  }
  return variable[0].toUpperCase() + variable.substr(1).toLowerCase();
}

const schema2kotlin = new Schema2Base(description, schemaName => `${titleCase(schemaName)}.kt`, generate);
schema2kotlin.call();
