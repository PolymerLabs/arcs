/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KotlinGenerationUtils} from './kotlin-generation-utils.js';
import {assert} from '../platform/assert-web.js';
import {Dictionary} from '../runtime/hot.js';

// Includes reserve words for Entity Interface
// https://kotlinlang.org/docs/reference/keyword-reference.html
// [...document.getElementsByTagName('code')].map(x => x.innerHTML);
const keywords = [
  'as', 'as?', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', '!in', 'interface', 'is',
  '!is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var',
  'when', 'while', 'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally', 'get', 'import',
  'init', 'param', 'property', 'receiver', 'set', 'setparam', 'where', 'actual', 'abstract', 'annotation', 'companion',
  'const', 'crossinline', 'data', 'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal',
  'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private', 'protected', 'public', 'reified', 'sealed',
  'suspend', 'tailrec', 'vararg', 'it', 'entityId', 'creationTimestamp', 'expirationTimestamp'
];

export function escapeIdentifier(name: string): string {
  // TODO(cypher1): Check for complex keywords (e.g. cases where both 'final' and 'final_' are keywords).
  // TODO(cypher1): Check for name overlaps (e.g. 'final' and 'final_' should not be escaped to the same identifier.
  return name + (keywords.includes(name) ? '_' : '');
}

export interface KotlinTypeInfo {
  type: string;
  decodeFn: string;
  defaultVal: string;
}

export function getTypeInfo(opts: { name: string, isCollection?: boolean, refClassName?: string, listTypeInfo?: {name: string, isInlineClass?: boolean}, isInlineClass?: boolean }): KotlinTypeInfo {
  if (opts.name === 'List') {
    assert(opts.listTypeInfo, 'listTypeInfo must be provided for Lists');
    assert(!opts.isCollection, 'collections of Lists are not supported');
    const itemTypeInfo = getTypeInfo(opts.listTypeInfo);
    return {
      type: `List<${itemTypeInfo.type}>`,
      decodeFn: `decodeList<${itemTypeInfo.type}>()`,
      defaultVal: `listOf<${itemTypeInfo.type}>()`,
    };
  }

  if (opts.isInlineClass) {
    if (opts.isCollection) {
      return {
        type: `Set<${opts.name}>`,
        decodeFn: `decodeInline<${opts.name}>()`,
        defaultVal: `emptySet<${opts.name}>()`,
      };
    }
    return {
      type: opts.name,
      decodeFn: `decodeInline<${opts.name}>()`,
      defaultVal: `${opts.name}()`,
    };
  }

  const typeMap: Dictionary<KotlinTypeInfo> = {
    'Text': {type: 'String', decodeFn: 'decodeText()', defaultVal: `""`},
    'URL': {type: 'String', decodeFn: 'decodeText()', defaultVal: `""`},
    'Number': {type: 'Double', decodeFn: 'decodeNum()', defaultVal: '0.0'},
    'BigInt': {type: 'BigInteger', decodeFn: 'decodeBigInt()', defaultVal: 'BigInteger.ZERO'},
    'Boolean': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false'},
    'Byte': {type: 'Byte', decodeFn: 'decodeByte()', defaultVal: '0.toByte()'},
    'Short': {type: 'Short', decodeFn: 'decodeShort()', defaultVal: '0.toShort()'},
    'Int': {type: 'Int', decodeFn: 'decodeInt()', defaultVal: '0'},
    'Long': {type: 'Long', decodeFn: 'decodeLong()', defaultVal: '0L'},
    'Char': {type: 'Char', decodeFn: 'decodeChar()', defaultVal: `'\u0000'`},
    'Float': {type: 'Float', decodeFn: 'decodeFloat()', defaultVal: '0.0f'},
    'Double': {type: 'Double', decodeFn: 'decodeNum()', defaultVal: '0.0'},
    'Reference': {type: `Reference<${opts.refClassName}>`, decodeFn: null, defaultVal: 'null'},
  };

  const info = typeMap[opts.name];
  if (!info) {
    throw new Error(`Unhandled type '${opts.name}' for kotlin.`);
  }
  if (opts.name === 'Reference') {
    assert(opts.refClassName, 'refClassName must be provided for References');
    if (!opts.isCollection) {
      // Singleton Reference fields are nullable.
      info.type += '?';
    }
  }
  if (opts.isCollection) {
    info.defaultVal = `emptySet<${info.type}>()`;
    info.type = `Set<${info.type}>`;
  }
  return info;
}
