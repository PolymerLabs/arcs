/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {digest} from '../platform/digest-web.js';
import {Dictionary} from './hot.js';
import {CRDTEntity, SingletonEntityModel, CollectionEntityModel} from './crdt/crdt-entity.js';
import {Referenceable} from './crdt/crdt-collection.js';
import {CRDTSingleton} from './crdt/crdt-singleton.js';
import {SchemaType} from './manifest-ast-nodes.js';
import {Refinement, AtleastAsSpecific} from './refiner.js';

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
  // The implementation of fromLiteral creates a cyclic dependency, so it is
  // separated out. This variable serves the purpose of an abstract static.
  static fromLiteral: SchemaMethod = null;

  // For convenience, primitive field types can be specified as {name: 'Type'}
  // in `fields`; the constructor will convert these to the correct schema form.
  // tslint:disable-next-line: no-any
  constructor(names: string[], fields: Dictionary<any>,
      options: {description?, refinement?: Refinement} = {}
    ) {
    this.names = names;
    this.fields = {};
    this.refinement = options.refinement || null;
    const fNs = this.refinement && this.refinement.getFieldNames();
    // if the schema level refinement is univariate, propogate it to the appropriate field
    if (fNs && fNs.size === 1 && Flags.fieldRefinementsAllowed) {
      const fN = fNs.values().next().value;
      fields[fN].refinement = Refinement.intersectionOf(fields[fN].refinement, this.refinement);
      this.refinement = null;
    }
    for (const [name, field] of Object.entries(fields)) {
      if (typeof(field) === 'string') {
        this.fields[name] = {kind: 'schema-primitive', refinement: null, type: field};
      } else {
        this.fields[name] = field;
      }
    }
    if (options.description) {
      options.description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
    }
  }

  toLiteral() {
    const fields = {};
    const updateField = field => {
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        return {kind: 'schema-reference', schema: {kind: schema.kind, model: schema.model.toLiteral()}};
      } else if (field.kind === 'schema-collection') {
        return {kind: 'schema-collection', schema: updateField(field.schema)};
      } else {
        return field;
      }
    };
    for (const key of Object.keys(this.fields)) {
      fields[key] = updateField(this.fields[key]);
    }

    return {names: this.names, fields, description: this.description, refinement: this.refinement};
  }

  // TODO(cypher1): This should only be an ident used in manifest parsing.
  get name() {
    return this.names[0];
  }

  static typesEqual(fieldType1, fieldType2): boolean {
    // TODO(cypher1): structural check instead of stringification.
    return Schema._typeString(fieldType1) === Schema._typeString(fieldType2);
  }

  static _typeString(type): string {
    switch (type.kind) {
      case 'schema-primitive':
        return type.type;
      case 'schema-union':
        return `(${type.types.map(t => t.type).join(' or ')})`;
      case 'schema-tuple':
        return `(${type.types.map(t => t.type).join(', ')})`;
      case 'schema-reference':
        return `&${Schema._typeString(type.schema)}`;
      case 'type-name':
      case 'schema-inline':
        return type.model.entitySchema.toInlineSchemaString();
      case 'schema-collection':
        return `[${Schema._typeString(type.schema)}]`;
      default:
        throw new Error(`Unknown type kind ${type.kind} in schema ${this.name}`);
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
      }
    }
    // if schema level refinement contains fields not present in the intersection, discard it
    const ref1 = !schema1.refinementHasFieldsNotIn(fields) ? schema1.refinement : null;
    const ref2 = !schema2.refinementHasFieldsNotIn(fields) ? schema2.refinement : null;
    return new Schema(names, fields, {refinement: Refinement.unionOf(ref1, ref2)});
  }

  equals(otherSchema: Schema): boolean {
    // TODO(cypher1): Check equality without calling contains.
    return this === otherSchema || (this.name === otherSchema.name
       && this.isAtleastAsSpecificAs(otherSchema)
       && otherSchema.isAtleastAsSpecificAs(this));
  }

  isAtleastAsSpecificAs(otherSchema: Schema): boolean {
    const names = new Set(this.names);
    for (const name of otherSchema.names) {
      if (!names.has(name)) {
        return false;
      }
    }
    // tslint:disable-next-line: no-any
    const fields: Dictionary<any> = {};
    for (const [name, type] of Object.entries(this.fields)) {
      fields[name] = type;
    }
    for (const [name, type] of Object.entries(otherSchema.fields)) {
      if (fields[name] == undefined) {
        return false;
      }
      if (!Schema.typesEqual(fields[name], type)) {
        return false;
      }
      if (Refinement.isAtleastAsSpecificAs(fields[name].refinement, type.refinement) === AtleastAsSpecific.NO) {
        return false;
      }
    }
    return Refinement.isAtleastAsSpecificAs(this.refinement, otherSchema.refinement) !== AtleastAsSpecific.NO;
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

  crdtConstructor<S extends Dictionary<Referenceable>, C extends Dictionary<Referenceable>>() {
    const singletons = {};
    const collections = {};
    // TODO(shans) do this properly
    for (const [field, {type}] of Object.entries(this.fields)) {
      if (['Text', 'URL', 'Boolean', 'Number'].includes(type)) {
        singletons[field] = new CRDTSingleton<{id: string}>();
      } else {
        throw new Error(`Big Scary Exception: entity field ${field} of type ${type} doesn't yet have a CRDT mapping implemented`);
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
    return `${name}: ${typeStr}${refExpr}`;
  }

  toInlineSchemaString(options?: {hideFields?: boolean}): string {
    const names = this.names.join(' ') || '*';
    const fields = Object.entries(this.fields).map(Schema.fieldToString).join(', ');
    return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}${this.refinement ? this.refinement.toString() : ''}`;
  }

  toManifestString(): string {
    const results:string[] = [];
    results.push(`schema ${this.names.join(' ')}`);
    results.push(...Object.entries(this.fields).map(f => `  ${Schema.fieldToString(f)}`));
    if (this.refinement) {
      results.push(this.refinement.toString());
    }
    if (Object.keys(this.description).length > 0) {
      results.push(`  description \`${this.description.pattern}\``);
      for (const name of Object.keys(this.description)) {
        if (name !== 'pattern') {
          results.push(`    ${name} \`${this.description[name]}\``);
        }
      }
    }
    return results.join('\n');
  }

  async hash(): Promise<string> {
    if (!this.hashStr) {
      this.hashStr = await digest(this.normalizeForHash());
    }
    return this.hashStr;
  }

  normalizeForHash(): string {
    let str = this.names.slice().sort().join(' ') + '/';
    for (const field of Object.keys(this.fields).sort()) {
      const {kind, type, schema} = this.fields[field];
      if (kind === 'schema-primitive') {
        str += field + ':' + type + '|';
      } else if (kind === 'schema-reference') {
        str += field + '&[' + schema.model.entitySchema.normalizeForHash() + ']';
      } else if (kind === 'schema-collection' && schema.kind === 'schema-reference') {
        str += field + '@[' + schema.schema.model.entitySchema.normalizeForHash() + ']';
      } else {
        throw new Error('Schema hash: unsupported field type');
      }
    }
    return str;
  }
}
