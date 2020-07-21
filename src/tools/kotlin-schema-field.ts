/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SchemaNode} from './schema2graph.js';
import {Dictionary} from '../runtime/hot.js';

/** Generates KotlinSchemaFields for a given SchemaNode */
export function generateFields(node: SchemaNode): KotlinSchemaField[] {
  return Object.entries(node.schema.fields).map(([name, descriptor]) => {

    const type = (function constructType(descriptor): SchemaFieldType {
      switch (descriptor.kind) {
        case 'schema-collection': return new CollectionType(constructType(descriptor.schema));
        case 'schema-ordered-list': return new ListType(constructType(descriptor.schema));
        case 'schema-reference': return new ReferenceType(constructType(descriptor.schema));
        case 'type-name': return new ReferencedSchema(node.refs.get(name));
        case 'schema-inline': return new ReferencedSchema(node.refs.get(name));
        case 'schema-nested': return new InlineSchema(node.refs.get(name));
        case 'schema-primitive':
        case 'kotlin-primitive': return new PrimitiveType(descriptor.type);
        default:
          throw new Error(`Schema kind '${descriptor.kind}' is not supported`);
      }
    })(descriptor);

    return new KotlinSchemaField(name, type);
  });
}

/** Represents a field in a schema */
export class KotlinSchemaField {
  constructor(readonly name: string, readonly type: SchemaFieldType) {}
}

/**
 * Root of the type hierarchy of schema fields:
 *
 * SchemaFieldType
 *  ├─TypeContainer
 *  │  ├─CollectionType
 *  │  ├─ListType
 *  │  └─ReferenceType
 *  ├─SchemaType
 *  │  ├─ReferencedSchema
 *  │  └─InlineSchema
 *  └─PrimitiveType
 */
export abstract class SchemaFieldType {

  abstract get defaultVal(): string;

  get isCollection() {
    return false;
  }

  get isSchema() {
    return false;
  }

  get isPrimitive() {
    return false;
  }

  get decodeFn(): string {
    throw new Error('Decoding function not available for this type');
  }

  get schemaHash(): string {
    throw new Error('Schema Hash not available for this type');
  }

  get arcsTypeName(): string {
    throw new Error('Arcs Type Name not available for this type');
  }

  get kotlinType() {
    return this.getKotlinType(false);
  }

  abstract unwrap(): SchemaFieldType;

  abstract getKotlinType(contained: boolean): string;
}

/** Super class of all type containers */
abstract class TypeContainer extends SchemaFieldType {

  constructor(readonly innerType: SchemaFieldType) {
    super();
  }

  get innerKotlinType() {
    return this.innerType.getKotlinType(true);
  }

  unwrap() {
    return this.innerType.unwrap();
  }
}

/** Collection type, e.g. [Number], [&Thing {...}] */
class CollectionType extends TypeContainer {

  constructor(innerType: SchemaFieldType) {
    super(innerType);
  }

  get isCollection() {
    return true;
  }

  getKotlinType() {
    return `Set<${this.innerKotlinType}>`;
  }

  get defaultVal() {
    return `emptySet()`;
  }

  get decodeFn() {
    return this.innerType.decodeFn;
  }
}

/** List type, e.g. List<Text>, List<inline Object {...}> */
class ListType extends TypeContainer {

  constructor(innerType: SchemaFieldType) {
    super(innerType);
  }

  getKotlinType() {
    return `List<${this.innerKotlinType}>`;
  }

  get defaultVal() {
    return `emptyList()`;
  }
}

/** Reference to an entity, e.g. &Person {name: Text} */
class ReferenceType extends TypeContainer {

  constructor(innerType: SchemaFieldType) {
    super(innerType);
  }

  getKotlinType(contained: boolean) {
    return `Reference<${this.innerKotlinType}>${contained ? '' : '?'}`;
  }

  get defaultVal() {
    return `null`;
  }
}

/** Super class for all schema-based type */
abstract class SchemaType extends SchemaFieldType {

  constructor(readonly node: SchemaNode) {
    super();
  }

  get isSchema() {
    return true;
  }

  getKotlinType() {
    return this.node.entityClassName;
  }

  get schemaHash() {
    return this.node.hash;
  }

  unwrap() {
    return this;
  }
}

/** Schema that is referenced, e.g. Person {name: Text} */
class ReferencedSchema extends SchemaType {
  constructor(node: SchemaNode) {
    super(node);
  }

  get defaultVal(): string {
    throw new Error('ReferencedSchema does not have a default value');
  }
}

/** An inline schema, e.g. inline Dimensions {height: Number, width: Number, depth: Number} */
class InlineSchema extends SchemaType {

  constructor(node: SchemaNode) {
    super(node);
  }

  get defaultVal() {
    return `${this.kotlinType}()`;
  }
}

/* An primitive type, e.g. Number, Char, Boolean, URL, BigInt */
class PrimitiveType extends SchemaFieldType {

  constructor(readonly _arcsTypeName: string) {
    super();
    if (!primitiveTypeMap[this.arcsTypeName]) throw new Error(`Invalid Primitive Type "${this.arcsTypeName}".`);
  }

  get isPrimitive() {
    return true;
  }

  get arcsTypeName() {
    return this._arcsTypeName;
  }

  getKotlinType() {
    return primitiveTypeMap[this.arcsTypeName].type;
  }

  get defaultVal() {
    return primitiveTypeMap[this.arcsTypeName].defaultVal;
  }

  get decodeFn() {
    return primitiveTypeMap[this.arcsTypeName].decodeFn;
  }

  unwrap() {
    return this;
  }
}

/** Exposes basic information about Arcs primitive types. */
export function getPrimitiveTypeInfo(name: string) {
  return primitiveTypeMap[name];
}

export interface KotlinTypeInfo {
  type: string;
  decodeFn: string;
  defaultVal: string;
}

const primitiveTypeMap: Dictionary<KotlinTypeInfo> = {
  'Text': {type: 'String', decodeFn: 'decodeText()', defaultVal: `""`},
  'URL': {type: 'String', decodeFn: 'decodeText()', defaultVal: `""`},
  'Number': {type: 'Double', decodeFn: 'decodeNum()', defaultVal: '0.0'},
  'BigInt': {type: 'BigInteger', decodeFn: 'decodeBigInt()', defaultVal: 'BigInteger.ZERO'},
  'Boolean': {type: 'Boolean', decodeFn: 'decodeBool()', defaultVal: 'false'},
  'Byte': {type: 'Byte', decodeFn: 'decodeByte()', defaultVal: '0.toByte()'},
  'Short': {type: 'Short', decodeFn: 'decodeShort()', defaultVal: '0.toShort()'},
  'Int': {type: 'Int', decodeFn: 'decodeInt()', defaultVal: '0'},
  'Long': {type: 'Long', decodeFn: 'decodeLong()', defaultVal: '0L'},
  'Char': {type: 'Char', decodeFn: 'decodeChar()', defaultVal: `'\\u0000'`},
  'Float': {type: 'Float', decodeFn: 'decodeFloat()', defaultVal: '0.0f'},
  'Double': {type: 'Double', decodeFn: 'decodeNum()', defaultVal: '0.0'},
};
