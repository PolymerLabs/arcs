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
import {SchemaGraph, SchemaNode} from './schema2graph.js';
import {HandleConnectionSpec} from '../runtime/particle-spec.js';
import {Type, TypeVariable} from '../runtime/type.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {assert} from '../platform/assert-web.js';
import {Dictionary} from '../runtime/hot.js';
import {Schema} from '../runtime/schema.js';

const ktUtils = new KotlinGenerationUtils();

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

/**
 * Generates a Kotlin type instance for the given handle connection.
 */
export function generateConnectionType(connection: HandleConnection,
                                       schemaRegistry: {schema: Schema, generation: string}[] = []): string {
  return generateConnectionSpecType(connection.spec, new SchemaGraph(connection.particle.spec).nodes, schemaRegistry);
}

export function generateConnectionSpecType(
  connection: HandleConnectionSpec,
  nodes: SchemaNode[],
  schemaRegistry: {schema: Schema, generation: string}[] = []): string {
  let type = connection.type;
  if (type.isEntity || type.isReference) {
    // Moving to the new style types with explicit singleton.
    type = type.singletonOf();
  }

  return (function generateType(type: Type): string {
    if (type.isEntity) {
      const node = nodes.find(n => n.schema.equals(type.getEntitySchema()));
      return ktUtils.applyFun('EntityType', [`${node.fullName(connection)}.SCHEMA`]);
    } else if (type.isVariable) {
      const node = nodes.find(n => n.variableName === (type as TypeVariable).variable.name);
      const schemaPair = schemaRegistry.find(pair => pair.schema.equals(type.getEntitySchema())) || {generation: 'Schema.EMPTY'};
      const schema = node != null ? `${node.fullName(connection)}.SCHEMA` : schemaPair.generation;
      return ktUtils.applyFun('EntityType', [schema]);
    } else if (type.isCollection) {
      return ktUtils.applyFun('CollectionType', [generateType(type.getContainedType())]);
    } else if (type.isSingleton) {
      return ktUtils.applyFun('SingletonType', [generateType(type.getContainedType())]);
    } else if (type.isReference) {
      return ktUtils.applyFun('ReferenceType', [generateType(type.getContainedType())]);
    } else if (type.isTuple) {
      return ktUtils.applyFun('TupleType.of', type.getContainedTypes().map(t => generateType(t)));
    } else {
      throw new Error(`Type '${type.tag}' not supported as code generated handle connection type.`);
    }
  })(type);
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
