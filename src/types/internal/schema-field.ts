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
import {Type, EntityType} from './type.js';
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

export abstract class SchemaField {
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

  getType(): string { return null; }
  getTypes(): SchemaField[] { return null; }
  getSchema(): SchemaField { return null; }
  getModel(): EntityType { return null; }

  abstract toString(): string;

  normalizeForHash(): string {
    throw new Error(`Schema hash: unsupported field type ${this.kind}`);
  }

  clone(): SchemaField {
    return SchemaField.create(this);
  }

  static create(theField: {}|string): SchemaField {
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
          newField = new CollectionField(SchemaField.create(field.schema));
          break;
        case Kind.Reference:
          newField = new ReferenceField(SchemaField.create(field.schema));
          break;
        case Kind.OrderedList:
          newField = new OrderedListField(SchemaField.create(field.schema));
          break;
        case Kind.Inline:
        case Kind.TypeName:
          newField = new InlineField(field.model);
          break;
        case Kind.Union:
          newField = new UnionField(field.types.map(type => SchemaField.create(type)));
          break;
        case Kind.Tuple:
          newField = new TupleField(field.types.map(type => SchemaField.create(type)));
          break;
        case Kind.Nested:
          newField = new NestedField(SchemaField.create(field.schema));
          break;
        default:
          throw new Error(`Unsupported schema field ${field.kind}`);
      }
    }
    newField.refinement = field.refinement || null;
    newField.annotations = field.annotations || [];
    return newField;
  }

}

export class PrimitiveField extends SchemaField {
  constructor(public readonly type: SchemaPrimitiveTypeValue) {
    super(Kind.Primitive);
    assert(this.type);
  }

  getType(): string { return this.type; }

  toString(): string { return this.type; }

  normalizeForHash(): string { return `${this.type}|`; }
}

export class KotlinPrimitiveField extends SchemaField {
  constructor(public readonly type: SchemaPrimitiveTypeValue) {
    super(Kind.KotlinPrimitive);
  }
  getType(): string { return this.type; }

  toString(): string { return this.type; }

  normalizeForHash(): string { return `${this.type}|`; }
}

export class CollectionField extends SchemaField {
  constructor(public readonly schema: SchemaField) {
    super(Kind.Collection);
  }

  getSchema(): SchemaField { return this.schema; }

  toString(): string { return `[${this.schema.toString()}]`; }

  normalizeForHash(): string {
    if (this.schema instanceof PrimitiveField || this.schema instanceof KotlinPrimitiveField) {
      return `[${this.schema.type}]`;
    }
    return `[${this.schema.normalizeForHash()}]`;
  }
}

export class ReferenceField extends SchemaField {
  constructor(public readonly schema: SchemaField) {
    super(Kind.Reference);
  }
  getSchema(): SchemaField { return this.schema; }

  toString(): string { return `&${this.schema.toString()}`; }

  normalizeForHash(): string { return `&(${this.schema.getModel().entitySchema.normalizeForHash()})`; }
}

export class OrderedListField extends SchemaField {
  constructor(public readonly schema: SchemaField) {
    super(Kind.OrderedList);
  }

  getSchema(): SchemaField { return this.schema; }

  toString(): string { return `List<${this.schema.toString()}>`; }

  normalizeForHash(): string {
    if (this.schema instanceof PrimitiveField || this.schema instanceof KotlinPrimitiveField) {
      return `List<${this.schema.type}>`;
    }
    return `List<${this.schema.normalizeForHash()}>`;
  }
}

export class UnionField extends SchemaField {
  constructor(public readonly types: SchemaField[]) {
    super(Kind.Union);
  }

  getTypes(): SchemaField[] { return this.types; }

  toString(): string { return `(${this.types.map(type => type.toString()).join(' or ')})`; }
}

export class TupleField extends SchemaField {
  constructor(public readonly types: SchemaField[]) {
    super(Kind.Tuple);
  }

  getTypes(): SchemaField[] { return this.types; }

  toString(): string { return `(${this.types.map(type => type.toString()).join(', ')})`; }

  normalizeForHash(): string { return `(${this.types.map(t => t.getType()).join('|')})`; }
}

export class NestedField extends SchemaField {
  constructor(public readonly schema: SchemaField) {
    super(Kind.Nested);
    assert(this.schema instanceof InlineField, 'Is `schema` always an inline schema?');
  }

  getSchema(): SchemaField { return this.schema; }

  toString(): string { return `inline ${this.schema.toString()}`; }

  normalizeForHash(): string { return `inline ${this.schema.getModel().entitySchema.normalizeForHash()}`; }
}

export class InlineField extends SchemaField {
  constructor(public readonly model: EntityType) {
    super(Kind.Inline);
  }
  getModel(): EntityType { return this.model; }

  toString(): string { return this.model.entitySchema.toInlineSchemaString(); }

  normalizeForHash(): string { return this.model.entitySchema.normalizeForHash(); }
}
