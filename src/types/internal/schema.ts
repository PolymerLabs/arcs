/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Refinement, AtLeastAsSpecific} from './refiner.js';
import {CollectionField, FieldType, InlineField, NestedField, OrderedListField, ReferenceField} from './schema-field.js';
import {Flags} from '../../runtime/flags.js';
import {mergeMapInto} from '../../utils/lib-utils.js';
import {AnnotationRef} from '../../runtime/arcs-types/annotation.js';
import {Primitive, SourceLocation} from '../../runtime/manifest-ast-types/manifest-ast-nodes.js';
import {Dictionary, IndentingStringBuilder} from '../../utils/lib-utils.js';
import {CRDTEntity, SingletonEntityModel, CollectionEntityModel, Referenceable,
        CRDTCollection, CRDTSingleton} from '../../crdt/lib-crdt.js';
import {assert} from '../../platform/assert-web.js';
import {digest} from '../../platform/digest-web.js';
import {Consumer} from '../../utils/lib-utils.js';

// tslint:disable-next-line: no-any
type SchemaMethod  = (data?: { fields: {}; names: any[]; description: {}; refinement: {}}) => Schema;

export class Schema {
  readonly names: string[];
  readonly fields: Dictionary<FieldType>;
  // tslint:disable-next-line: no-any
  refinement?: Refinement;
  description: Dictionary<string> = {};
  isAlias: boolean;
  hashStr: string = null;
  _annotations: AnnotationRef[];
  location?: SourceLocation = null;
  // The implementation of fromLiteral creates a cyclic dependency, so it is
  // separated out. This variable serves the purpose of an abstract static.
  static fromLiteral: SchemaMethod = null;

  static EMPTY = new Schema([], {});

  // For convenience, primitive field types can be specified as {name: 'Type'}
  // in `fields`; the constructor will convert these to the correct schema form.
  // tslint:disable-next-line: no-any
  constructor(names: string[], fields: Dictionary<any>,
      options: {description?, refinement?: Refinement, annotations?: AnnotationRef[]} = {}
    ) {
    this.names = names;
    this.fields = {};
    this.refinement = options.refinement || null;
    const fNs = this.refinement && this.refinement.getFieldParams();
    // if the schema level refinement is univariate, propogate it to the appropriate field
    if (fNs && fNs.size === 1 && Flags.fieldRefinementsAllowed) {
      const fN = fNs.keys().next().value;
      fields[fN].refinement = Refinement.intersectionOf(fields[fN].refinement, this.refinement);
      this.refinement = null;
    }
    for (const [name, field] of Object.entries(fields)) {
      this.fields[name] = field instanceof FieldType ? field : FieldType.create(field);
    }
    if (options.description && options.description.description) {
      // The descriptions should be passed ready for assignment into this.description.
      // TODO(cypher1): Refactor the schema construction code to do this rearrangement at the call site.
      options.description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
    }
    this.annotations = options.annotations || [];
  }

  private forEachRefinement(func: Consumer<Refinement>): void {
    const types = [this, ...Object.values(this.fields)];
    types.forEach(type => type.refinement && func(type.refinement));
  }

  getFieldParams(): Map<string, Primitive> {
    const params = new Map<string, Primitive>();
    this.forEachRefinement(
      (ref: Refinement) => mergeMapInto(params, ref.getFieldParams())
    );
    return params;
  }

  getQueryParams(): Map<string, Primitive> {
    const params = new Map<string, Primitive>();
    this.forEachRefinement(
      (ref: Refinement) => mergeMapInto(params, ref.getQueryParams())
    );
    return params;
  }

  getQueryType(): string {
    return this.getQueryParams().get('?');
  }

  extractRefinementFromQuery(): Schema {
    const fields = [];
    for (const [name, fieldType] of Object.entries(this.fields)) {
      const field = {...fieldType};
      field.refinement = field.refinement && field.refinement.extractRefinementFromQuery();
      fields[name] = field;
    }
    const options = {
      refinement: this.refinement && this.refinement.extractRefinementFromQuery()
    };
    const schema = new Schema(this.names, fields, options);
    if (this.description) {
      schema.description = this.description;
    }
    return schema;
  }

  toLiteral() {
    const fields = {};
    for (const key of Object.keys(this.fields)) {
      fields[key] = this.fields[key].toLiteral();
    }

    const lit = {
      names: this.names,
      fields,
      description: this.description,
      refinement: this.refinement && this.refinement.toLiteral(),
      annotations: this.annotations
    };
    if (this.location !== null) {
      lit['location'] = this.location;
    }
    return lit;
  }

  // TODO(cypher1): This should only be an ident used in manifest parsing.
  get name() {
    return this.names[0];
  }

  get annotations(): AnnotationRef[] { return this._annotations; }
  set annotations(annotations: AnnotationRef[]) {
    annotations.every(a => assert(a.isValidForTarget('Schema'),
        `Annotation '${a.name}' is invalid for Schema`));
    this._annotations = annotations;
  }
  getAnnotation(name: string): AnnotationRef | null {
    const annotations = this.findAnnotations(name);
    assert(annotations.length <= 1,
        `Multiple annotations found for '${name}'. Use findAnnotations instead.`);
    return annotations.length === 0 ? null : annotations[0];
  }
  findAnnotations(name: string): AnnotationRef[] {
    return this.annotations.filter(a => a.name === name);
  }

  static typesEqual(fieldType1, fieldType2): boolean {
    return fieldType1.equals(fieldType2);
  }

  private static fieldTypeUnion(infield1: FieldType, infield2: FieldType): FieldType|null {
    // Ensure that changes to the field types are non-side-effecting
    const field1 = infield1 && infield1.clone();
    const field2 = infield2 && infield2.clone();
    if (field1.kind !== field2.kind) return null;
    switch (field1.kind) {
      case 'schema-collection': {
        const unionSchema = Schema.fieldTypeUnion(field1.getFieldType(), field2.getFieldType());
        if (!unionSchema) {
          return null;
        }
        return new CollectionField(unionSchema);
      }
      case 'schema-reference': {
        const unionSchema = Schema.union(
          field1.getEntityType().entitySchema, field2.getEntityType().entitySchema);
        if (!unionSchema) {
          return null;
        }
        // Note: this is done because new EntityType(unionSchema) causes circular dependency.
        // tslint:disable-next-line: no-any
        const inlineUnionLiteral: any = field1.getFieldType().toLiteral();
        inlineUnionLiteral.model.entitySchema = unionSchema;
        return new ReferenceField(FieldType.create(inlineUnionLiteral));
      }
      case 'schema-nested': {
        const unionSchema = Schema.union(
            field1.getEntityType().entitySchema, field2.getEntityType().entitySchema);
        if (!unionSchema) {
          return null;
        }
        // Note: this is done because new EntityType(unionSchema) causes circular dependency.
        // tslint:disable-next-line: no-any
        const inlineUnionLiteral: any = field1.getFieldType().toLiteral();
        inlineUnionLiteral.model.entitySchema = unionSchema;
        return new NestedField(FieldType.create(inlineUnionLiteral));
      }
      case 'schema-ordered-list': {
        const unionSchema = Schema.fieldTypeUnion(field1.getFieldType(), field2.getFieldType());
        if (!unionSchema) {
          return null;
        }
        return new OrderedListField(unionSchema);
      }
      default:
        return Schema.typesEqual(field1, field2) ? field1 : null;
    }
  }

  static union(schema1: Schema, schema2: Schema): Schema|null {
    const names = [...new Set([...schema1.names, ...schema2.names])];
    const fields = {};

    for (const [field, type] of [...Object.entries(schema1.fields), ...Object.entries(schema2.fields)]) {
      if (fields[field]) {
        const fieldUnionSchema = Schema.fieldTypeUnion(fields[field], type);
        if (!fieldUnionSchema) {
          return null;
        }
        if (!Schema.typesEqual(fields[field], fieldUnionSchema)) {
          fields[field] = {...fields[field], ...fieldUnionSchema};
        }
        fields[field].refinement = Refinement.intersectionOf(fields[field].refinement, type.refinement);
        fields[field].annotations = [...(fields[field].annotations || []), ...(type.annotations || [])];
      } else {
        fields[field] = type.clone();
      }
    }
    return new Schema(names, fields, {refinement: Refinement.intersectionOf(schema1.refinement, schema2.refinement)});
  }

  private static fieldTypeIntersection(infield1: FieldType, infield2: FieldType): FieldType|null {
    // Ensure that changes to the field types are non-side-effecting
    const field1 = infield1 && infield1.clone();
    const field2 = infield2 && infield2.clone();
    const missingField1 = (field1 === null || field1 === undefined);
    const missingField2 = (field2 === null || field2 === undefined);
    if (missingField1 || missingField2) {
      // TODO(b/174115805, b/144507619, b/144507352): Handle nullables
      // (with make it possible to store 'true' unions)
      return null;
    }
    // TODO: non-eq Kinds?
    if (field1.kind !== field2.kind) return null;
    switch (field1.kind) {
      case 'schema-collection': {
        const intersectSchema = Schema.fieldTypeIntersection(field1.getFieldType(), field2.getFieldType());
        if (!intersectSchema) {
          return null;
        }
        return new CollectionField(intersectSchema);
      }
      case 'schema-reference': {
        const intersectSchema = Schema.intersect(
          field1.getEntityType().entitySchema, field2.getEntityType().entitySchema);
        if (!intersectSchema) {
          return null;
        }
        // Note: this is done because new EntityType(intersectSchema) causes circular dependency.
        // tslint:disable-next-line: no-any
        const inlineIntersectionLiteral: any = field1.getFieldType().toLiteral();
        inlineIntersectionLiteral.model.entitySchema = intersectSchema;
        return new ReferenceField(FieldType.create(inlineIntersectionLiteral));
      }
      case 'schema-nested': {
        const intersectSchema = Schema.intersect(
            field1.getEntityType().entitySchema, field2.getEntityType().entitySchema);
        if (!intersectSchema) {
          return null;
        }
        // Note: this is done because new EntityType(intersectSchema) causes circular dependency.
        // tslint:disable-next-line: no-any
        const inlineIntersectionLiteral: any = field1.getFieldType().toLiteral();
        inlineIntersectionLiteral.model.entitySchema = intersectSchema;
        return new NestedField(FieldType.create(inlineIntersectionLiteral));
      }
      case 'schema-ordered-list': {
        const intersectSchema = Schema.fieldTypeIntersection(field1.getFieldType(), field2.getFieldType());
        if (!intersectSchema) {
          return null;
        }
        return new OrderedListField(intersectSchema);
      }
      default:
        return Schema.typesEqual(field1, field2) ? field1 : null;
    }
  }

  static intersect(schema1: Schema, schema2: Schema): Schema {
    const names = [...schema1.names].filter(name => schema2.names.includes(name));
    const fields = {};

    const fieldNames = new Set([...Object.keys(schema1.fields), ...Object.keys(schema2.fields)]);
    for (const field of fieldNames) {
      const type = schema1.fields[field];
      const otherType = schema2.fields[field];
      const intersectionType = Schema.fieldTypeIntersection(type, otherType);
      if (intersectionType) {
        fields[field] = intersectionType;
        fields[field].refinement = Refinement.unionOf(type && type.refinement, otherType && otherType.refinement);
        fields[field].annotations = (type.annotations || []).filter(a => (otherType.annotations || []).includes(a));
      }
    }
    // if schema level refinement contains fields not present in the intersection, discard it
    const ref1 = !schema1.refinementHasFieldsNotIn(fields) ? schema1.refinement : null;
    const ref2 = !schema2.refinementHasFieldsNotIn(fields) ? schema2.refinement : null;
    return new Schema(names, fields, {refinement: Refinement.unionOf(ref1, ref2)});
  }

  equals(otherSchema: Schema): boolean {
    if (this === otherSchema) {
      return true;
    }
    return (this.isEquivalentOrMoreSpecific(otherSchema) === AtLeastAsSpecific.YES)
       && (otherSchema.isEquivalentOrMoreSpecific(this) === AtLeastAsSpecific.YES);
  }

  isEquivalentOrMoreSpecific(otherSchema: Schema): AtLeastAsSpecific {
    const names = new Set(this.names);
    for (const name of otherSchema.names) {
      if (!names.has(name)) {
        return AtLeastAsSpecific.NO;
      }
    }
    // tslint:disable-next-line: no-any
    const fields: Dictionary<any> = {};
    for (const [name, type] of Object.entries(this.fields)) {
      fields[name] = type;
    }
    let best = AtLeastAsSpecific.YES;
    for (const [name, type] of Object.entries(otherSchema.fields)) {
      if (fields[name] == undefined) {
        return AtLeastAsSpecific.NO;
      }
      if (!fields[name].isAtLeastAsSpecificAs(type)) {
        return AtLeastAsSpecific.NO;
      }
      const fieldRes = Refinement.isAtLeastAsSpecificAs(fields[name].refinement, type.refinement);
      if (fieldRes === AtLeastAsSpecific.NO) {
        return AtLeastAsSpecific.NO;
      } else if (fieldRes === AtLeastAsSpecific.UNKNOWN) {
        best = AtLeastAsSpecific.UNKNOWN;
      }
    }
    const res = Refinement.isAtLeastAsSpecificAs(this.refinement, otherSchema.refinement);
    if (res === AtLeastAsSpecific.NO) {
      return AtLeastAsSpecific.NO;
    } else if (res === AtLeastAsSpecific.UNKNOWN) {
      best = AtLeastAsSpecific.UNKNOWN;
    }
    return best;
  }

  isAtLeastAsSpecificAs(otherSchema: Schema): boolean {
    // Implementation moved to isEquivalentOrMoreSpecific to allow handling 'unknowns' in code gen.
    return this.isEquivalentOrMoreSpecific(otherSchema) !== AtLeastAsSpecific.NO;
  }

  // Returns true if there are fields in this.refinement, that are not in fields
  refinementHasFieldsNotIn(fields): boolean {
    const amb = Object.keys(this.fields).filter(k => !(k in fields));
    for (const field of amb) {
      if (this.refinement && this.refinement.containsField(field)) {
        return true;
      }
    }
    return false;
  }

  hasQuery(): boolean {
    if (!this.refinement) {
      return false;
    }
    const qParams: Map<string, string> = this.refinement.getQueryParams();
    return qParams.size > 0;
  }

  crdtConstructor<S extends Dictionary<Referenceable>, C extends Dictionary<Referenceable>>() {
    const singletons = {};
    const collections = {};

    // This implementation only supports:
    //   - singleton of a primitive,
    //   - singleton of a reference,
    //   - collection of primitives,
    //   - collection of references
    for (const [fieldName, field] of Object.entries(this.fields)) {
      const type = field.getType();
      const schema = field.getFieldType();
      switch (field.kind) {
        case 'schema-primitive': {
          if (['Text', 'URL', 'Boolean', 'Number'].includes(type)) {
            singletons[fieldName] = new CRDTSingleton<{id: string}>();
          } else {
            throw new Error(`Big Scary Exception: entity field ${fieldName} of type ${type} doesn't yet have a CRDT mapping implemented`);
          }
          break;
        }
        case 'schema-collection': {
          if (schema == undefined) {
            throw new Error(`there is no schema for the entity field ${fieldName}`);
          }
          if (['Text', 'URL', 'Boolean', 'Number'].includes(schema.getType())) {
            collections[fieldName] = new CRDTCollection<{id: string}>();
          } else if (schema.kind === 'schema-reference') {
            collections[fieldName] = new CRDTCollection<Referenceable>();
          } else {
            throw new Error(`Big Scary Exception: entity field ${fieldName} of type ${schema.getType()} doesn't yet have a CRDT mapping implemented`);
          }
          break;
        }
        case 'schema-reference': {
          singletons[fieldName] = new CRDTSingleton<Referenceable>();
          break;
        }
        case 'schema-ordered-list': {
          singletons[fieldName] = new CRDTSingleton<{id: string}>();
          break;
        }
        default: {
          throw new Error(`Big Scary Exception: entity field ${fieldName} of type ${schema.getType()} doesn't yet have a CRDT mapping implemented`);
        }
      }
    }
    return class EntityCRDT extends CRDTEntity<S, C> {
      constructor() {
        super(singletons as SingletonEntityModel<S>, collections as CollectionEntityModel<C>);
      }
    };
  }

  // TODO(jopra): Enforce that 'type' of a field is a Type.
  fieldToString([name, type]: [string, FieldType]) {
    const refExpr = type.refinement ? type.refinement.toString() : '';
    const annotationsStr = (type.annotations || []).map(ann => ` ${ann.toString()}`).join('');
    return `${name}: ${type.toString()}${refExpr}${annotationsStr}`;
  }

  toInlineSchemaString(options?: {hideFields?: boolean}): string {
    const names = this.names.join(' ') || '*';
    const fields = Object.entries(this.fields).map(this.fieldToString).join(', ');
    return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}${this.refinement ? this.refinement.toString() : ''}`;
  }

  toManifestString(builder = new IndentingStringBuilder()): string {
    builder.push(...this.annotations.map(a => a.toString()));
    builder.push(`schema ${this.names.join(' ')}`);
    builder.withIndent(builder => {
      builder.push(...Object.entries(this.fields).map(f => this.fieldToString(f)));
      if (this.refinement) {
        builder.push(this.refinement.toString());
      }
      if (Object.keys(this.description).length > 0) {
        builder.push(`description \`${this.description.pattern}\``);
        builder.withIndent(builder => {
          for (const name of Object.keys(this.description)) {
            if (name !== 'pattern') {
              builder.push(`${name} \`${this.description[name]}\``);
            }
          }
        });
      }
    });
    return builder.toString();
  }

  async hash(): Promise<string> {
    if (!this.hashStr) {
      this.hashStr = await digest(this.normalizeForHash());
    }
    return this.hashStr;
  }

  normalizeForHash(): string {
    return this.names.slice().sort().join(' ') + '/' +
      Object.keys(this.fields).sort().map(field =>
        `${field}:${this.fields[field].normalizeForHash()}`
      ).join('') + '/';
  }
}
