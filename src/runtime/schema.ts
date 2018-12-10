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
import {Type, EntityType, ReferenceType} from './type.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Entity} from './entity.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {Reference} from './reference.js';

export class Schema {
  readonly names: string[];
  readonly fields: {};
  description: {[index: string]: string};
  isAlias: boolean;

  constructor(names: string[], fields: {}, description?) {
    this.names = names;
    this.fields = fields;
    this.description = {};
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

  entityClass(context: ParticleExecutionContext = null): typeof Entity {
    const schema = this;
    const className = this.name;
    const classJunk = ['toJSON', 'prototype', 'toString', 'inspect'];

    const convertToJsType = fieldType => {
      switch (fieldType) {
        case 'Text':
          return 'string';
        case 'URL':
          return 'string';
        case 'Number':
          return 'number';
        case 'Boolean':
          return 'boolean';
        case 'Object':
          return 'object';
        default:
          throw new Error(`Unknown field type ${fieldType} in schema ${className}`);
      }
    };

    const fieldTypes = this.fields;
    const validateFieldAndTypes = (op, name, value) => _validateFieldAndTypes(op, name, fieldTypes[name], value);

    const _validateFieldAndTypes = (op, name, fieldType, value) => {
      if (fieldType === undefined) {
        throw new Error(`Can't ${op} field ${name}; not in schema ${className}`);
      }
      if (value === undefined || value === null) {
        return;
      }

      if (typeof(fieldType) !== 'object') {
        // Primitive fields.
        if (typeof(value) !== convertToJsType(fieldType)) {
          throw new TypeError(
              `Type mismatch ${op}ting field ${name} (type ${fieldType}); ` +
              `value '${value}' is type ${typeof(value)}`);
        }
        return;
      }

      switch (fieldType.kind) {
        case 'schema-union':
          // Value must be a primitive that matches one of the union types.
          for (const innerType of fieldType.types) {
            if (typeof(value) === convertToJsType(innerType)) {
              return;
            }
          }
          throw new TypeError(
              `Type mismatch ${op}ting field ${name} (union [${fieldType.types}]); ` +
              `value '${value}' is type ${typeof(value)}`);

        case 'schema-tuple':
          // Value must be an array whose contents match each of the tuple types.
          if (!Array.isArray(value)) {
            throw new TypeError(`Cannot ${op} tuple ${name} with non-array value '${value}'`);
          }
          if (value.length !== fieldType.types.length) {
            throw new TypeError(`Length mismatch ${op}ting tuple ${name} ` +
                                `[${fieldType.types}] with value '${value}'`);
          }
          fieldType.types.map((innerType, i) => {
            if (value[i] !== undefined && value[i] !== null &&
                typeof(value[i]) !== convertToJsType(innerType)) {
              throw new TypeError(
                  `Type mismatch ${op}ting field ${name} (tuple [${fieldType.types}]); ` +
                  `value '${value}' has type ${typeof(value[i])} at index ${i}`);
            }
          });
          break;
        case 'schema-reference':
          if (!(value instanceof Reference)) {
            throw new TypeError(`Cannot ${op} reference ${name} with non-reference '${value}'`);
          }
          if (!TypeChecker.compareTypes({type: value.type}, {type: new ReferenceType(fieldType.schema.model)})) {
            throw new TypeError(`Cannot ${op} reference ${name} with value '${value}' of mismatched type`);
          }
          break;
        case 'schema-collection':
          // WTF?! value instanceof Set is returning false sometimes here because the Set in
          // this environment (a native code constructor) isn't equal to the Set that the value
          // has been constructed with (another native code constructor)...
          if (value.constructor.name !== 'Set') {
            throw new TypeError(`Cannot ${op} collection ${name} with non-Set '${value}'`);
          }
          for (const element of value) {
            _validateFieldAndTypes(op, name, fieldType.schema, element);
          }
          break;
        default:
          throw new Error(`Unknown kind ${fieldType.kind} in schema ${className}`);
      }
    };

    const clazz = class extends Entity {
      constructor(data, userIDComponent?: string) {
        super(userIDComponent);
        this.rawData = new Proxy({}, {
          get: (target, name : string) => {
            if (classJunk.includes(name) || name.constructor === Symbol) {
              return undefined;
            }
            const value = target[name];
            validateFieldAndTypes('get', name, value);
            return value;
          },
          set: (target, name, value) => {
            validateFieldAndTypes('set', name, value);
            target[name] = value;
            return true;
          }
        });
        assert(data, `can't construct entity with null data`);

        // TODO: figure out how to do this only on wire-created entities.
        const sanitizedData = this.sanitizeData(data);
        for (const [name, value] of Object.entries(sanitizedData)) {
          this.rawData[name] = value;
        }

      }

      private sanitizeData(data) {
        const sanitizedData = {};
        for (const [name, value] of Object.entries(data)) {
          sanitizedData[name] = this.sanitizeEntry(fieldTypes[name], value, name);
        }
        return sanitizedData;
      }

      private sanitizeEntry(type, value, name) {
        if (!type) {
          // If there isn't a field type for this, the proxy will pick up
          // that fact and report a meaningful error.
          return value;
        }
        if (type.kind === 'schema-reference' && value) {
          if (value instanceof Reference) {
            // Setting value as Reference (Particle side). This will enforce that the type provided for
            // the handle matches the type of the reference.
            return value;
          } else if ((value as {id}).id && (value as {storageKey}).storageKey) {
            // Setting value from raw data (Channel side).
            // TODO(shans): This can't enforce type safety here as there isn't any type data available.
            // Maybe this is OK because there's type checking on the other side of the channel?
            return new Reference(value as {id, storageKey}, new ReferenceType(type.schema.model), context);
          } else {
            throw new TypeError(`Cannot set reference ${name} with non-reference '${value}'`);
          }
        } else if (type.kind === 'schema-collection' && value) {
          // WTF?! value instanceof Set is returning false sometimes here because the Set in
          // this environment (a native code constructor) isn't equal to the Set that the value
          // has been constructed with (another native code constructor)...
          if (value.constructor.name === 'Set') {
            return value;
          } else if (value.length && value instanceof Object) {
            return new Set(value.map(v => this.sanitizeEntry(type.schema, v, name)));
          } else {
            throw new TypeError(`Cannot set collection ${name} with non-collection '${value}'`);
          }
        } else {
          return value;
        }
      }

      dataClone() {
        const clone = {};
        for (const name of Object.keys(schema.fields)) {
          if (this.rawData[name] !== undefined) {
            if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference') {
              clone[name] = this.rawData[name].dataClone();
            } else if (fieldTypes[name] && fieldTypes[name].kind === 'schema-collection') {
              clone[name] = [...this.rawData[name]].map(a => a.dataClone());
            } else {
              clone[name] = this.rawData[name];
            }
          }
        }
        return clone;
      }

      static get type(): Type {
        // TODO: should the entity's key just be its type?
        // Should it just be called type in that case?
        return new EntityType(this.key.schema);
      }

      static get key() {
        return {tag: 'entity', schema};
      }
    };

    Object.defineProperty(clazz, 'type', {value: this.type});
    Object.defineProperty(clazz, 'name', {value: this.name});
    // TODO: add query / getter functions for user properties
    for (const name of Object.keys(this.fields)) {
      Object.defineProperty(clazz.prototype, name, {
        get() {
          return this.rawData[name];
        },
        set(v) {
          this.rawData[name] = v;
        }
      });
    }
    return clazz;
  }

  toInlineSchemaString(options): string {
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
}
