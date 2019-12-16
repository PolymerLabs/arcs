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
  'suspend', 'tailrec', 'vararg', 'it', 'internalId'
];

const typeMap = {
  'T': {type: 'String', decodeFn: 'decodeText()', delegate: `TextDelegate()`},
  'U': {type: 'String', decodeFn: 'decodeText()', delegate: `TextDelegate()`},
  'N': {type: 'Double', decodeFn: 'decodeNum()', delegate: 'NumDelegate()'},
  'B': {type: 'Boolean', decodeFn: 'decodeBool()', delegate: 'BooleanDelegate()'},
  'R': {type: '', decodeFn: '', delegate: ''},
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

${withCustomPackage(`import arcs.Particle;
import arcs.Entity
import arcs.StringEncoder
import arcs.StringDecoder
`)}
import kotlin.reflect.KProperty\n`;
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    return new KotlinGenerator(node);
  }

  fileFooter(): string {
    console.log(`child`);
    return `
class TextDelegate {
    var isSet = false
    var v = ""
    operator fun getValue(thisRef: Any?, property: KProperty<*>): String {
        return v
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: String) {
        this.isSet = true
        this.v = value
    }
}

class NumDelegate {
    var isSet = false
    var v = 0.0
    operator fun getValue(thisRef: Any?, property: KProperty<*>): Double {
        return v
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: Double) {
        this.isSet = true
        this.v = value
    }
}

class BooleanDelegate {
    var isSet = false
    var v = false
    operator fun getValue(thisRef: Any?, property: KProperty<*>): Boolean {
        return v
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: Boolean) {
        this.isSet = true
        this.v = value
    }
}
`;
  }
}

class KotlinGenerator implements ClassGenerator {
  fields: string[] = [];
  fieldVals: string[] = [];
  fieldSets: string[] = [];
  encode: string[] = [];
  decode: string[] = [];

  constructor(readonly node: SchemaNode) {}

  addField(field: string, typeChar: string) {
    const {type, decodeFn, delegate} = typeMap[typeChar];
    const fixed = field + (keywords.includes(field) ? '_' : '');

    this.fields.push(`${fixed}: ${type}`);
    this.fieldVals.push(`var ${fixed} by ${delegate}`);
    this.fieldSets.push(`this.${fixed} = ${fixed}`);

    this.decode.push(`"${field}" -> {`,
                     `    decoder.validate("${typeChar}")`,
                     `    this.${fixed} = decoder.${decodeFn}`,
                     `}`);
                     
    this.encode.push(`${fixed}.let { encoder.encode("${field}:${typeChar}", ${fixed}) }`);
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

class ${name}() : Entity<${name}>() {

    ${ withFields(`${this.fieldVals.join('\n    ')}`) }

    constructor(${ withFields(`\n        ${this.fields.join(',\n        ')}\n    `) }): this() {
        ${ withFields(`${this.fieldSets.join('\n        ')}`)}
    }
  

    override fun decodeEntity(encoded: String): ${name}? {
        if (encoded.isEmpty()) return null

        val decoder = StringDecoder(encoded)
        internalId = decoder.decodeText()
        decoder.validate("|")
        ${withFields(`for (_i in 0 until ${fieldCount}) {
            if (decoder.done()) break
            val name = decoder.upTo(":")
            when (name) {
                ${this.decode.join('\n                ')}
            }
            decoder.validate("|")
        }`)}
        return this
    }

    override fun encodeEntity(): String {
        val encoder = StringEncoder()
        encoder.encode("", internalId)
        ${this.encode.join('\n        ')}
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
