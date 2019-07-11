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

function generate(name: string, schema): string  {
  return '';
}

const schema2kotlin = new Schema2Base(description, (schemaName => `${schemaName}.kt`), generate);
schema2kotlin.call();
