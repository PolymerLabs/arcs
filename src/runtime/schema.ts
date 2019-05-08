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

import {EntityClass, Entity} from './entity.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {EntityType, Type} from './type.js';

export class Schema {
  readonly names: string[];
  // tslint:disable-next-line: no-any
  readonly fields: {[index: string]: any};
  description: {[index: string]: string} = {};
  isAlias: boolean;

  // tslint:disable-next-line: no-any
  constructor(names: string[], fields: {[index: string]: any}, description?) {
    this.names = names;
    this.fields = fields;

    if (description) {
      description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
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

    return {names: this.names, fields, description: this.description};
  }

  static fromLiteral(data = {fields: {}, names: [], description: {}}) {
    const fields = {};
    const updateField = field => {
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        return {kind: 'schema-reference', schema: {kind: schema.kind, model: Type.fromLiteral(schema.model)}};
      } else if (field.kind === 'schema-collection') {
        return {kind: 'schema-collection', schema: updateField(field.schema)};
      } else {
        return field;
      }
    };
    for (const key of Object.keys(data.fields)) {
      fields[key] = updateField(data.fields[key]);
    }

    const result = new Schema(data.names, fields);
    result.description = data.description || {};
    return result;
  }

  // TODO: This should only be an ident used in manifest parsing.
  get name() {
    return this.names[0];
  }

  static typesEqual(fieldType1, fieldType2): boolean {
    // TODO: structural check instead of stringification.
    return Schema._typeString(fieldType1) === Schema._typeString(fieldType2);
  }

  static _typeString(type): string {
    if (typeof(type) !== 'object') {
      assert(typeof type === 'string');
      return type;
    }
    switch (type.kind) {
      case 'schema-union':
        return `(${type.types.join(' or ')})`;
      case 'schema-tuple':
        return `(${type.types.join(', ')})`;
      case 'schema-reference':
        return `Reference<${Schema._typeString(type.schema)}>`;
      case 'type-name':
      case 'schema-inline':
        return type.model.entitySchema.toInlineSchemaString();
      case 'schema-collection':
        return `[${Schema._typeString(type.schema)}]`;
      default:
        throw new Error(`Unknown type kind ${type.kind} in schema ${this.name}`);
    }
  }

  static union(schema1: Schema, schema2: Schema): Schema {
    const names = [...new Set([...schema1.names, ...schema2.names])];
    const fields = {};

    for (const [field, type] of [...Object.entries(schema1.fields), ...Object.entries(schema2.fields)]) {
      if (fields[field]) {
        if (!Schema.typesEqual(fields[field], type)) {
          return null;
        }
      } else {
        fields[field] = type;
      }
    }

    return new Schema(names, fields);
  }

  static intersect(schema1: Schema, schema2: Schema): Schema {
    const names = [...schema1.names].filter(name => schema2.names.includes(name));
    const fields = {};

    for (const [field, type] of Object.entries(schema1.fields)) {
      const otherType = schema2.fields[field];
      if (otherType && Schema.typesEqual(type, otherType)) {
        fields[field] = type;
      }
    }

    return new Schema(names, fields);
  }

  equals(otherSchema: Schema): boolean {
    return this === otherSchema || (this.name === otherSchema.name
       // TODO: Check equality without calling contains.
       && this.isMoreSpecificThan(otherSchema)
       && otherSchema.isMoreSpecificThan(this));
  }

  isMoreSpecificThan(otherSchema: Schema): boolean {
    const names = new Set(this.names);
    for (const name of otherSchema.names) {
      if (!names.has(name)) {
        return false;
      }
    }
    const fields = {};
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
    }
    return true;
  }

  get type(): Type {
    return new EntityType(this);
  }

  entityClass(context: ParticleExecutionContext = null): EntityClass {
    return Entity.createEntityClass(this, context);
  }

  toInlineSchemaString(options?: {hideFields?: boolean}): string {
    const names = this.names.join(' ') || '*';
    const fields = Object.entries(this.fields).map(([name, type]) => `${Schema._typeString(type)} ${name}`).join(', ');
    return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}`;
  }

  toManifestString(): string {
    const results:string[] = [];
    results.push(`schema ${this.names.join(' ')}`);
    results.push(...Object.entries(this.fields).map(([name, type]) => `  ${Schema._typeString(type)} ${name}`));
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

  // Returns a JSON representation that protobufjs can use to de/serialize entity data as protobufs.
  toProtoJSON() {
    assert(this.names.length > 0, 'At least one schema name is required for proto-json conversion');

    let id = 0;
    let hasUrl = false;
    const fields = {};
    for (const [name, type] of Object.entries(this.fields).sort()) {
      id++;
      let field;
      if (type.kind === 'schema-collection') {
        field = {rule: 'repeated', type: this.jsonBaseType(type.schema), id};
      } else {
        field = {type: this.jsonBaseType(type), id};
      }
      hasUrl = hasUrl || (field.type === 'Url');
      fields[name] = field;
    }
    const json = {
      nested: {
        [this.name]: {fields}
      }
    };
    if (hasUrl) {
      json.nested.Url = {fields: {href: {type: 'string', id: 1}}};
    }
    return json;
  }

  private jsonBaseType(type) {
    const kind = type.kind || type;
    switch (kind) {
      case 'Text':
        return 'string';

      case 'URL':
        return 'Url';

      case 'Number':
        return 'double';

      case 'Boolean':
        return 'bool';

      case 'Bytes':
      case 'Object':
      case 'schema-union':
      case 'schema-tuple':
      case 'schema-reference':
        throw new Error(`'${kind}' not yet supported for schema to proto-json conversion`);

      case 'schema-collection':
        throw new Error(`Nested collections not yet supported for schema to proto-json conversion`);

      default:
        throw new Error(`Unknown type '${kind}' in schema ${this.name}`);
    }
  }
}
