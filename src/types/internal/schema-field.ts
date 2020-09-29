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
type SchemaFieldMethod  = (field: {}) => FieldType;

export abstract class FieldType {
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
  getFieldTypes(): FieldType[] { return null; }
  getFieldType(): FieldType { return null; }
  getEntityType(): EntityType { return null; }

  abstract toString(): string;

  abstract normalizeForHash(): string;

  clone(): FieldType {
    // tslint:disable-next-line: no-any
    const literal: any = this.toLiteral();
    if (literal.refinement) {
      literal.refinement = Refinement.fromLiteral(literal.refinement);
    }
    return FieldType.fromLiteral(literal);
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {
      kind: this.kind,
      annotations: this.annotations,
      refinement: this.refinement ? this.refinement.toLiteral() : null
    };
  }

  equals(other: FieldType): boolean {
    // TODO(cypher1): structural check instead of stringification.
    return this.toString() === other.toString();
  }

  // TODO(shans): output AtLeastAsSpecific here. This is necessary to support
  // refinements on nested structures and references.
  isAtLeastAsSpecificAs(other: FieldType): boolean {
    assert(this.kind === other.kind);
    return this.equals(other);
  }

  static create(theField: {}|string): FieldType {
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
          newField = new CollectionField(FieldType.create(field.schema));
          break;
        case Kind.Reference:
          newField = new ReferenceField(FieldType.create(field.schema));
          break;
        case Kind.OrderedList:
          newField = new OrderedListField(FieldType.create(field.schema));
          break;
        case Kind.Inline:
        case Kind.TypeName:
          newField = new InlineField(field.model);
          break;
        case Kind.Union:
          newField = new UnionField(field.types.map(type => FieldType.create(type)));
          break;
        case Kind.Tuple:
          newField = new TupleField(field.types.map(type => FieldType.create(type)));
          break;
        case Kind.Nested:
          newField = new NestedField(FieldType.create(field.schema));
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

export class PrimitiveField extends FieldType {
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

export class KotlinPrimitiveField extends FieldType {
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

export class CollectionField extends FieldType {
  constructor(public readonly schema: FieldType) {
    super(Kind.Collection);
  }

  getFieldType(): FieldType { return this.schema; }

  getEntityType(): EntityType {
    return this.getFieldType().getFieldType() ? this.getFieldType().getFieldType().getEntityType() : null;
  }

  toString(): string { return `[${this.schema.toString()}]`; }

  normalizeForHash(): string {
    if (this.schema.isPrimitive || this.schema.isKotlinPrimitive) {
      return `[${this.schema.getType()}]`;
    }
    return `[${this.schema.normalizeForHash()}]`;
  }

  isAtLeastAsSpecificAs(other: FieldType): boolean {
    assert(this.kind === other.kind);
    return this.getFieldType().isAtLeastAsSpecificAs(other.getFieldType());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), schema: this.schema.toLiteral()};
  }
}

export class ReferenceField extends FieldType {
  constructor(public readonly schema: FieldType) {
    super(Kind.Reference);
    assert(this.schema);
  }
  getFieldType(): FieldType { return this.schema; }

  getEntityType(): EntityType { return this.getFieldType().getEntityType(); }

  toString(): string { return `&${this.schema.toString()}`; }

  normalizeForHash(): string { return `&(${this.schema.getEntityType().entitySchema.normalizeForHash()})`; }

  isAtLeastAsSpecificAs(other: FieldType): boolean {
    assert(this.kind === other.kind);
    return this.getFieldType().getEntityType().isAtLeastAsSpecificAs(other.getFieldType().getEntityType());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {
      ...super.toLiteral(),
      schema: {kind: this.schema.kind, model: this.schema.getEntityType().toLiteral()}
    };
  }
}

export class OrderedListField extends FieldType {
  constructor(public readonly schema: FieldType) {
    super(Kind.OrderedList);
  }

  getFieldType(): FieldType { return this.schema; }

  getEntityType(): EntityType {
    return this.getFieldType().getFieldType() ? this.getFieldType().getFieldType().getEntityType() : null;
  }

  toString(): string { return `List<${this.schema.toString()}>`; }

  normalizeForHash(): string {
    if (this.schema.isPrimitive || this.schema.isKotlinPrimitive) {
      return `List<${this.schema.getType()}>`;
    }
    return `List<${this.schema.normalizeForHash()}>`;
  }

  isAtLeastAsSpecificAs(other: FieldType): boolean {
    assert(this.kind === other.kind);
    return this.getFieldType().isAtLeastAsSpecificAs(other.getFieldType());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), schema: this.schema.toLiteral()};
  }
}

export class UnionField extends FieldType {
  constructor(public readonly types: FieldType[]) {
    super(Kind.Union);
  }

  getFieldTypes(): FieldType[] { return this.types; }

  toString(): string { return `(${this.types.map(type => type.toString()).join(' or ')})`; }

  normalizeForHash(): string { return `(${this.types.map(t => t.getType()).join('|')})`; }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), types: this.types.map(t => t.toLiteral())};
  }
}

export class TupleField extends FieldType {
  constructor(public readonly types: FieldType[]) {
    super(Kind.Tuple);
  }

  getFieldTypes(): FieldType[] { return this.types; }

  toString(): string { return `(${this.types.map(type => type.toString()).join(', ')})`; }

  normalizeForHash(): string { return `(${this.types.map(t => t.getType()).join('|')})`; }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), types: this.types.map(t => t.toLiteral())};
  }
}

export class NestedField extends FieldType {
  constructor(public readonly schema: FieldType) {
    super(Kind.Nested);
    assert(this.schema.isInline);
  }

  getFieldType(): FieldType { return this.schema; }

  getEntityType(): EntityType { return this.getFieldType().getEntityType(); }

  toString(): string { return `inline ${this.schema.toString()}`; }

  normalizeForHash(): string { return `inline ${this.getEntityType().entitySchema.normalizeForHash()}`; }

  isAtLeastAsSpecificAs(other: FieldType): boolean {
    assert(this.kind === other.kind);
    return this.getEntityType().isAtLeastAsSpecificAs(other.getEntityType());
  }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), schema: this.schema.toLiteral()};
  }
}

export class InlineField extends FieldType {
  constructor(public readonly model: EntityType) {
    super(Kind.Inline);
  }

  getEntityType(): EntityType { return this.model; }

  toString(): string { return this.getEntityType().getEntitySchema().toInlineSchemaString(); }

  normalizeForHash(): string { return this.getEntityType().getEntitySchema().normalizeForHash(); }

  // tslint:disable-next-line: no-any
  toLiteral(): {} {
    return {...super.toLiteral(), model: this.getEntityType()};
  }
}
