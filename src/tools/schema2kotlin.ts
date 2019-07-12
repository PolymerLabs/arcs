/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Schema2Base, typeSummary} from './schema2base.js';

const description = `Generates Kotlin code from Schemas for use in wasm particles.`;

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

function generate(name: string, schema): string  {

  const fields: string[] = [];
  const encode: string[] = [];
  const decode: string[] = [];


  const privateFields = ['var num_: Double = 0.0', 'var txt_: String = ""', 'var lnk_: URL = ""', 'var flg_: Boolean = false'];
  const forDecode = [
`"num" -> {
     decoder.validate("N")
     num_ = decoder.decodeNum()
}`,
`"txt" -> {
    decoder.validate("T")
    txt_ = decoder.decodeText()
}`,
`"lnk" -> {
    decoder.validate("U")
    lnk_ = decoder.decodeText()
}`,
`"flg" -> {
    decoder.validate("B")
    flg_ = decoder.decodeBool()
}`];

  const forEncode = [
    'encoder.encode("num:N", num_)',
    'encoder.encode("txt:T", txt_)',
    'encoder.encode("lnk:U", lnk_)',
    'encoder.encode("flg:B", flg_)',
  ];

  const content = `
package arcs 

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

data class ${name}(
   ${privateFields.join(', ')} 
) : Entity<${name}>() {
    override fun decodeEntity(encoded: String): ${name}? {
        if (encoded.isEmpty()) {
            return null
        }
        val decoder = StringDecoder(encoded)
        this.internalId = decoder.decodeText()
        decoder.validate("|")
        var i = 0
        while (!decoder.done() && i < ${privateFields.length}) {
            val name = decoder.upTo(":")
            when (name) {
${leftPad(forDecode.join('\n'), 16)}
            }
            decoder.validate("|")
            i++
        }
        return this
    }

    override fun encodeEntity(): String {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
${leftPad(forEncode.join('\n'), 8)}
        return encoder.result()
    }
}`;

  // Post-process whole file
  return content.replace(/ +\n/g, '\n');
}

function titleCase(variable: string): string {
  if (variable === '') {
    return '';
  }
  return variable[0].toUpperCase() + variable.substr(1).toLowerCase();
}

const schema2kotlin = new Schema2Base(description, (schemaName => `${titleCase(schemaName)}.kt`), generate);
schema2kotlin.call();
