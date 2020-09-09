/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Refinement} from './refiner.js';
import {EntityType, ReferenceType, Type} from './type.js';
import {AnnotationRef} from '../../runtime/arcs-types/annotation.js';
import {SchemaPrimitiveTypeValue, KotlinPrimitiveTypeValue, BinaryExpressionNode} from '../../runtime/manifest-ast-types/manifest-ast-nodes.js';

export enum Kind {
  Primitive = 'schema-primitive',
  KotlinPrimitive = 'kotlin-primitive',
  Collection = 'schema-collection',
  Reference = 'schema-reference',
  OrderedList = 'schema-ordered-list',
  Union = 'schema-union',
  Tuple = 'schema-tuple',
  Nested = 'schema-nested',
  Inline = 'schema-inline',
  TypeName = 'type-name' // same as inline.
}

// tslint:disable-next-line: no-any
type SchemaFieldMethod  = (field: {}) => SchemaFieldType;

export abstract class SchemaFieldType {
  public refinement: Refinement = null;
  public readonly annotations: AnnotationRef[] = [];

  protected constructor(public readonly kind: Kind) {}
  get isPrimitive(): boolean { return this.kind === Kind.Primitive; }
  get isKotlinPrimitive(): boolean { return this.kind === Kind.KotlinPrimitive; }
  get isCollection(): boolean { return this.kind === Kind.Collection; }
  get isReference(): boolean { return this.kind === Kind.Reference; }
  get isOrderedList(): boolean { return this.kind === Kind.OrderedList; }
  get isUnion(): boolean { return this.kind === Kind.Union; }
  get isTuple(): boolean { return this.kind === Kind.Tuple; }
  get isNested(): boolean { return this.kind === Kind.Nested; }
  get isInline(): boolean { return this.kind === Kind.Inline || this.kind === Kind.TypeName; }

  getType(): SchemaPrimitiveTypeValue | KotlinPrimitiveTypeValue { return null; }
  getTypes(): SchemaFieldType[] { return null; }
  getSchema(): SchemaFieldType { return null; }
  getEntityType(): EntityType { return null; }

  abstract toString(): string;

  abstract normalizeForHash(): string;

  clone(): SchemaFieldType {
    return SchemaFieldType.create(this);
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {
      kind: this.kind,
      annotations: this.annotations,
      refinement: this.refinement ? this.refinement.toLiteral() : null
    };
  }

  equals(other: SchemaFieldType): boolean {
    // TODO(cypher1): structural check instead of stringification.
    return this.toString() === other.toString();
  }

  // TODO(shans): output AtLeastAsSpecific here. This is necessary to support
  // refinements on nested structures and references.
  isAtLeastAsSpecificAs(other: SchemaFieldType): boolean {
    assert(this.kind === other.kind);
    return this.equals(other);
  }

  static create(theField: {}|string): SchemaFieldType {
    let newField = null;
    // tslint:disable-next-line: no-any
    const field = theField as any;
    if (typeof(field) === 'string') {
      assert(['Text', 'URL', 'Number', 'Boolean', 'Bytes'].includes(field), `non-primitive schema type ${field} need to be defined as a parser production`);
      newField = new PrimitiveField(field as SchemaPrimitiveTypeValue);
    } else {
      switch (field.kind) {
        case Kind.Primitive:
          newField = new PrimitiveField(field.type);
          break;
        case Kind.KotlinPrimitive:
          newField = new KotlinPrimitiveField(field.type);
          break;
        case Kind.Collection:
          newField = new CollectionField(SchemaFieldType.create(field.schema));
          break;
        case Kind.Reference:
          newField = new ReferenceField(SchemaFieldType.create(field.schema));
          break;
        case Kind.OrderedList:
          newField = new OrderedListField(SchemaFieldType.create(field.schema));
          break;
        case Kind.Inline:
        case Kind.TypeName:
          newField = new InlineField(field.model);
          break;
        case Kind.Union:
          newField = new UnionField(field.types.map(type => SchemaFieldType.create(type)));
          break;
        case Kind.Tuple:
          newField = new TupleField(field.types.map(type => SchemaFieldType.create(type)));
          break;
        case Kind.Nested:
          newField = new NestedField(SchemaFieldType.create(field.schema));
          break;
        default:
          throw new Error(`Unsupported schema field ${field.kind}`);
      }
    }
    newField.refinement = field.refinement || null;
    newField.annotations = field.annotations || [];
    return newField;
  }

  // The implementation of fromLiteral creates a cyclic dependency, so it is
  // separated out. This variable serves the purpose of an abstract static.
  static fromLiteral: SchemaFieldMethod = null;
}

export class PrimitiveField extends SchemaFieldType {
  constructor(public readonly type: SchemaPrimitiveTypeValue) {
    super(Kind.Primitive);
    assert(this.type);
  }

  getType(): SchemaPrimitiveTypeValue { return this.type; }

  toString(): string { return this.type; }

  normalizeForHash(): string { return `${this.type}|`; }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), type: this.type};
  }
}

export class KotlinPrimitiveField extends SchemaFieldType {
  constructor(public readonly type: KotlinPrimitiveTypeValue) {
    super(Kind.KotlinPrimitive);
  }
  getType(): KotlinPrimitiveTypeValue { return this.type; }

  toString(): string { return this.type; }

  normalizeForHash(): string { return `${this.type}|`; }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), type: this.type};
  }
}

export class CollectionField extends SchemaFieldType {
  constructor(public readonly schema: SchemaFieldType) {
    super(Kind.Collection);
  }

  getSchema(): SchemaFieldType { return this.schema; }

  getEntityType(): EntityType {
    return this.getSchema().getSchema() ? this.getSchema().getSchema().getEntityType() : null;
  }

  toString(): string { return `[${this.schema.toString()}]`; }

  normalizeForHash(): string {
    if (this.schema.isPrimitive || this.schema.isKotlinPrimitive) {
      return `[${this.schema.getType()}]`;
    }
    return `[${this.schema.normalizeForHash()}]`;
  }

  isAtLeastAsSpecificAs(other: SchemaFieldType): boolean {
    assert(this.kind === other.kind);
    return this.getSchema().isAtLeastAsSpecificAs(other.getSchema());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {kind: this.kind, schema: this.schema.toLiteral()};
  }
}

export class ReferenceField extends SchemaFieldType {
  constructor(public readonly schema: SchemaFieldType) {
    super(Kind.Reference);
  }
  getSchema(): SchemaFieldType { return this.schema; }

  getEntityType(): EntityType { return this.getSchema().getEntityType(); }

  toString(): string { return `&${this.schema.toString()}`; }

  normalizeForHash(): string { return `&(${this.schema.getEntityType().entitySchema.normalizeForHash()})`; }

  isAtLeastAsSpecificAs(other: SchemaFieldType): boolean {
    assert(this.kind === other.kind);
    return this.getSchema().getEntityType().isAtLeastAsSpecificAs(other.getSchema().getEntityType());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {
      kind: this.kind,
      schema: {kind: this.schema.kind, model: this.schema.getEntityType().toLiteral()}
    };
  }
}

export class OrderedListField extends SchemaFieldType {
  constructor(public readonly schema: SchemaFieldType) {
    super(Kind.OrderedList);
  }

  getSchema(): SchemaFieldType { return this.schema; }

  getEntityType(): EntityType {
    return this.getSchema().getSchema() ? this.getSchema().getSchema().getEntityType() : null;
  }

  toString(): string { return `List<${this.schema.toString()}>`; }

  normalizeForHash(): string {
    if (this.schema.isPrimitive || this.schema.isKotlinPrimitive) {
      return `List<${this.schema.getType()}>`;
    }
    return `List<${this.schema.normalizeForHash()}>`;
  }

  isAtLeastAsSpecificAs(other: SchemaFieldType): boolean {
    assert(this.kind === other.kind);
    return this.getSchema().isAtLeastAsSpecificAs(other.getSchema());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), schema: this.schema.toLiteral()};
  }
}

export class UnionField extends SchemaFieldType {
  constructor(public readonly types: SchemaFieldType[]) {
    super(Kind.Union);
  }

  getTypes(): SchemaFieldType[] { return this.types; }

  toString(): string { return `(${this.types.map(type => type.toString()).join(' or ')})`; }

  normalizeForHash(): string { return `(${this.types.map(t => t.getType()).join('|')})`; }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), types: this.types.map(t => t.toLiteral())};
  }
}

export class TupleField extends SchemaFieldType {
  constructor(public readonly types: SchemaFieldType[]) {
    super(Kind.Tuple);
  }

  getTypes(): SchemaFieldType[] { return this.types; }

  toString(): string { return `(${this.types.map(type => type.toString()).join(', ')})`; }

  normalizeForHash(): string { return `(${this.types.map(t => t.getType()).join('|')})`; }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), types: this.types.map(t => t.toLiteral())};
  }
}

export class NestedField extends SchemaFieldType {
  constructor(public readonly schema: SchemaFieldType) {
    super(Kind.Nested);
    assert(this.schema.isInline);
  }

  getSchema(): SchemaFieldType { return this.schema; }

  getEntityType(): EntityType { return this.getSchema().getEntityType(); }

  toString(): string { return `inline ${this.schema.toString()}`; }

  normalizeForHash(): string { return `inline ${this.getEntityType().entitySchema.normalizeForHash()}`; }

  isAtLeastAsSpecificAs(other: SchemaFieldType): boolean {
    assert(this.kind === other.kind);
    return this.getEntityType().isAtLeastAsSpecificAs(other.getEntityType());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), schema: this.schema.toLiteral()};
  }
}

export class InlineField extends SchemaFieldType {
  constructor(public readonly model: EntityType) {
    super(Kind.Inline);
  }
  getEntityType(): EntityType { return this.model; }

  toString(): string { return this.model.entitySchema.toInlineSchemaString(); }

  normalizeForHash(): string { return this.model.entitySchema.normalizeForHash(); }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), model: this.model};
  }
}
