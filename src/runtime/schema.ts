/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {digest} from '../platform/digest-web.js';
import {Dictionary} from './hot.js';
import {CRDTEntity, SingletonEntityModel, CollectionEntityModel} from './crdt/crdt-entity.js';
import {Referenceable, CRDTCollection} from './crdt/crdt-collection.js';
import {CRDTSingleton} from './crdt/crdt-singleton.js';
import {Flags} from './flags.js';
import {SchemaType} from './manifest-ast-nodes.js';
import {Refinement, AtLeastAsSpecific} from './refiner.js';
import {Reference} from './reference.js';
import {AnnotationRef} from './recipe/annotation.js';
import {ManifestStringBuilder} from './manifest-string-builder.js';

// tslint:disable-next-line: no-any
type SchemaMethod  = (data?: { fields: {}; names: any[]; description: {}; refinement: {}}) => Schema;

export class Schema {
  readonly names: string[];
  // tslint:disable-next-line: no-any
  readonly fields: Dictionary<any>;
  // tslint:disable-next-line: no-any
  refinement?: Refinement;
  description: Dictionary<string> = {};
  isAlias: boolean;
  hashStr: string = null;
  _annotations: AnnotationRef[];
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
      if (typeof(field) === 'string') {
        assert(['Text', 'URL', 'Number', 'Boolean', 'Bytes'].includes(field), `non-primitive schema type ${field} need to be defined as a parser production`);
        this.fields[name] = {kind: 'schema-primitive', refinement: null, type: field, annotations: []};
      } else {
        this.fields[name] = field;
      }
    }
    if (options.description) {
      options.description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
    }
    this.annotations = options.annotations || [];
  }

  toLiteral() {
    const fields = {};
    const updateField = fieldType => {
      if (fieldType.kind === 'schema-reference') {
        const schema = fieldType.schema;
        return {kind: 'schema-reference', schema: {kind: schema.kind, model: schema.model.toLiteral()}};
      } else if (fieldType.kind === 'schema-collection') {
        return {kind: 'schema-collection', schema: updateField(fieldType.schema)};
      } else {
        const fieldLiteralType = {...fieldType};
        if (fieldType.refinement) {
          fieldLiteralType.refinement = fieldType.refinement.toLiteral();
        }
        return fieldLiteralType;
      }
    };
    for (const key of Object.keys(this.fields)) {
      fields[key] = updateField(this.fields[key]);
    }

    return {
      names: this.names,
      fields,
      description: this.description,
      refinement: this.refinement && this.refinement.toLiteral(),
      annotations: this.annotations
    };
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
    // TODO(cypher1): structural check instead of stringification.
    return Schema._typeString(fieldType1) === Schema._typeString(fieldType2);
  }

  static _typeString(type: SchemaType): string {
    switch (type.kind) {
      case 'kotlin-primitive':
      case 'schema-primitive':
        return type.type;
      case 'kotlin-primitive':
        return `${type.type}`;
      case 'schema-union':
        return `(${type.types.map(t => t.type).join(' or ')})`;
      case 'schema-tuple':
        return `(${type.types.map(t => t.type).join(', ')})`;
      case 'schema-reference':
        return `&${Schema._typeString(type.schema)}`;
      case 'type-name':
      case 'schema-inline':
        return type['model'].entitySchema.toInlineSchemaString();
      case 'schema-collection':
        return `[${Schema._typeString(type.schema)}]`;
      case 'schema-ordered-list':
        return `List<${Schema._typeString(type.schema)}>`;
      case 'schema-nested':
        return `inline ${Schema._typeString(type.schema)}`;
      default:
        throw new Error(`Unknown type kind ${type['kind']} in schema ${this.name}`);
    }
  }

  static union(schema1: Schema, schema2: Schema): Schema|null {
    const names = [...new Set([...schema1.names, ...schema2.names])];
    const fields = {};

    for (const [field, type] of [...Object.entries(schema1.fields), ...Object.entries(schema2.fields)]) {
      if (fields[field]) {
        if (!Schema.typesEqual(fields[field], type)) {
          return null;
        }
        fields[field].refinement = Refinement.intersectionOf(fields[field].refinement, type.refinement);
        fields[field].annotations = [...(fields[field].annotations || []), ...(type.annotations || [])];
      } else {
        fields[field] = {...type};
      }
    }
    return new Schema(names, fields, {refinement: Refinement.intersectionOf(schema1.refinement, schema2.refinement)});
  }

  static intersect(schema1: Schema, schema2: Schema): Schema {
    const names = [...schema1.names].filter(name => schema2.names.includes(name));
    const fields = {};

    for (const [field, type] of Object.entries(schema1.fields)) {
      const otherType = schema2.fields[field];
      if (otherType && Schema.typesEqual(type, otherType)) {
        fields[field] = {...type};
        fields[field].refinement = Refinement.unionOf(type.refinement, otherType.refinement);
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
      if (type.kind && type.kind === 'schema-nested') {
        if (!(fields[name].kind && fields[name].kind === 'schema-nested')) {
          return AtLeastAsSpecific.NO;
        }
        const subResult = fields[name].schema.model.entitySchema.isEquivalentOrMoreSpecific(type.schema.model.entitySchema);
        switch (subResult) {
          case AtLeastAsSpecific.NO:
            return AtLeastAsSpecific.NO;
          case AtLeastAsSpecific.UNKNOWN:
            best = AtLeastAsSpecific.UNKNOWN;
            break;
          default:
            break;
        }
      }
      else if (!Schema.typesEqual(fields[name], type)) {
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
    for (const [field, {kind, type, schema}] of Object.entries(this.fields)) {
      switch (kind) {
        case 'schema-primitive': {
          if (['Text', 'URL', 'Boolean', 'Number'].includes(type)) {
            singletons[field] = new CRDTSingleton<{id: string}>();
          } else {
            throw new Error(`Big Scary Exception: entity field ${field} of type ${type} doesn't yet have a CRDT mapping implemented`);
          }
          break;
        }
        case 'schema-collection': {
          if (schema == undefined) {
            throw new Error(`there is no schema for the entity field ${field}`);
          }
          if (['Text', 'URL', 'Boolean', 'Number'].includes(schema.type)) {
            collections[field] = new CRDTCollection<{id: string}>();
          } else if (schema.kind === 'schema-reference') {
            collections[field] = new CRDTCollection<Reference>();
          } else {
            throw new Error(`Big Scary Exception: entity field ${field} of type ${schema.type} doesn't yet have a CRDT mapping implemented`);
          }
          break;
        }
        case 'schema-reference': {
          singletons[field] = new CRDTSingleton<Reference>();
          break;
        }
        case 'schema-ordered-list': {
          singletons[field] = new CRDTSingleton<{id: string}>();
          break;
        }
        default: {
          throw new Error(`Big Scary Exception: entity field ${field} of type ${schema.type} doesn't yet have a CRDT mapping implemented`);
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
  // tslint:disable-next-line: no-any
  static fieldToString([name, type]: [string, SchemaType]) {
    const typeStr = Schema._typeString(type);
    const refExpr = type.refinement ? type.refinement.toString() : '';
    const annotationsStr = (type.annotations || []).map(ann => ` ${ann.toString()}`).join('');
    return `${name}: ${typeStr}${refExpr}${annotationsStr}`;
  }

  toInlineSchemaString(options?: {hideFields?: boolean}): string {
    const names = this.names.join(' ') || '*';
    const fields = Object.entries(this.fields).map(Schema.fieldToString).join(', ');
    return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}${this.refinement ? this.refinement.toString() : ''}`;
  }

  toManifestString(builder = new ManifestStringBuilder()): string {
    builder.push(...this.annotations.map(a => a.toString()));
    builder.push(`schema ${this.names.join(' ')}`);
    builder.withIndent(builder => {
      builder.push(...Object.entries(this.fields).map(f => Schema.fieldToString(f)));
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

  private normalizeTypeForHash({kind, type, schema, types}) {
    if (kind === 'schema-primitive' || kind === 'kotlin-primitive') {
      return `${type}|`;
    } else if (kind === 'schema-reference') {
      return `&(${schema.model.entitySchema.normalizeForHash()})`;
    } else if (kind === 'schema-collection') {
      if (schema.kind === 'schema-primitive' || schema.kind === 'kotlin-primitive') {
        return `[${schema.type}]`;
      }
      return `[${this.normalizeTypeForHash(schema)}]`;
    } else if (kind === 'schema-tuple') {
      return `(${types.map(t => t.type).join('|')})`;
    } else if (kind === 'schema-ordered-list') {
      return `List<${schema.type}>`;
    } else if (kind === 'schema-nested') {
      return `inline ${schema.model.entitySchema.normalizeForHash()}`;
    } else {
      throw new Error('Schema hash: unsupported field type');
    }
  }

  normalizeForHash(): string {
    return this.names.slice().sort().join(' ') + '/' +
      Object.keys(this.fields).sort().map(field =>
        `${field}:${this.normalizeTypeForHash(this.fields[field])}`
      ).join('');
  }
}
