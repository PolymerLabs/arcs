/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Type} from './type.js';
import {TypeChecker} from '../recipe/type-checker.js';
import {Entity} from '../entity.js';
import { Reference } from './reference.js';

export class Schema {
  // tslint:disable-next-line: no-any
  private readonly _model: {names: string[], fields: {[index: string]: any}};
  description: {[index: string]: string};

  constructor(model) {
    const legacy:string[] = [];
    // TODO: remove this (remnants of normative/optional)
    if (model.sections) {
      legacy.push('sections');
      assert(!model.fields);
      model.fields = {};
      for (const section of model.sections) {
        Object.assign(model.fields, section.fields);
      }
      delete model.sections;
    }
    if (model.name) {
      legacy.push('name');
      model.names = [model.name];
      delete model.name;
    }
    if (model.parents) {
      legacy.push('parents');
      for (const parent of model.parents) {
        const parentSchema = new Schema(parent);
        model.names.push(...parent.names);
        Object.assign(model.fields, parent.fields);
      }
      model.names = [...new Set(model.names)];
    }
    if (legacy.length > 0) {
      console.warn(`Schema ${model.names[0] || '*'} was serialized with legacy format (${legacy.join(', ')})`, new Error());
    }
    assert(model.fields);
    this._model = model;
    this.description = {};
    if (model.description) {
      model.description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
    }
  }

  toLiteral() {
    const fields = {};
    for (const key of Object.keys(this._model.fields)) {
      const field = this._model.fields[key];
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        fields[key]  = {kind: 'schema-reference', schema: {kind: schema.kind, model: schema.model.toLiteral()}};
      } else {
        fields[key] = field;
      }
    } 
    return {names: this._model.names, fields, description: this.description};
  }

  static fromLiteral(data) {
    const fields = {};
    for (const key of Object.keys(data.fields)) {
      const field = data.fields[key];
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        fields[key] = {kind: 'schema-reference', schema: {kind: schema.kind, model: Type.fromLiteral(schema.model)}};
      } else {
        fields[key] = field;
      }
    }
    const result = new Schema({names: data.names, fields});
    result.description = data.description;
    return result;
  }

  get fields() {
    return this._model.fields;
  }

  get names() {
    return this._model.names;
  }

  // TODO: This should only be an ident used in manifest parsing.
  get name() {
    return this.names[0];
  }

  static typesEqual(fieldType1, fieldType2) {
    // TODO: structural check instead of stringification.
    return Schema._typeString(fieldType1) === Schema._typeString(fieldType2);
  }

  static _typeString(type) {
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
      default:
        throw new Error(`Unknown type kind ${type.kind} in schema ${this.name}`);
    }
  }

  static union(schema1, schema2) {
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

    return new Schema({
      names,
      fields,
    });
  }

  static intersect(schema1, schema2) {
    const names = [...schema1.names].filter(name => schema2.names.includes(name));
    const fields = {};

    for (const [field, type] of Object.entries(schema1.fields)) {
      const otherType = schema2.fields[field];
      if (otherType && Schema.typesEqual(type, otherType)) {
        fields[field] = type;
      }
    }

    return new Schema({
      names,
      fields,
    });
  }

  equals(otherSchema) {
    return this === otherSchema || (this.name === otherSchema.name
       // TODO: Check equality without calling contains.
       && this.isMoreSpecificThan(otherSchema)
       && otherSchema.isMoreSpecificThan(this));
  }

  isMoreSpecificThan(otherSchema) {
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

  get type() {
    return Type.newEntity(this);
  }

  entityClass(context = null) {
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
    const validateFieldAndTypes = (op, name, value) => {
      const fieldType = fieldTypes[name];
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
          if (!TypeChecker.compareTypes({type: value.type}, {type: Type.newReference(fieldType.schema.model)})) {
            throw new TypeError(`Cannot ${op} reference ${name} with value '${value}' of mismatched type`);
          }
          break;
          default:
          throw new Error(`Unknown kind ${fieldType.kind} in schema ${className}`);
      }
    };

    const clazz = class extends Entity {
      // tslint:disable-next-line: no-any
      rawData: any;
      constructor(data, userIDComponent) {
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
        for (const [name, value] of Object.entries(data)) {
          if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference' && value) {
            let type;
            if (value instanceof Reference) {
              // Setting value as Reference (Particle side). This will enforce that the type provided for
              // the handle matches the type of the reference.
              type = value.type;
            } else if ((value as {id}).id && (value as {storageKey}).storageKey) {
              // Setting value from raw data (Channel side).
              // TODO(shans): This can't enforce type safety here as there isn't any type data available.
              // Maybe this is OK because there's type checking on the other side of the channel?
              type = fieldTypes[name].schema.model;
            } else {
              throw new TypeError(`Cannot set reference ${name} with non-reference '${value}'`);
            }
            this.rawData[name] = new Reference(value as {id, storageKey}, Type.newReference(type), context);
          } else {
            this.rawData[name] = value;
          }
        }
      }

      dataClone() {
        const clone = {};
        for (const name of Object.keys(schema.fields)) {
          if (this.rawData[name] !== undefined) {
            if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference') {
              clone[name] = this.rawData[name].dataClone();
            } else {
              clone[name] = this.rawData[name];
            }
          }
        }
        return clone;
      }

      static get key() {
        return {
          tag: 'entity',
          schema: schema.toLiteral(),
        };
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

  toInlineSchemaString(options) {
    const names = (this.names || ['*']).join(' ');
    const fields = Object.entries(this.fields).map(([name, type]) => `${Schema._typeString(type)} ${name}`).join(', ');
    return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}`;
  }

  toManifestString() {
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
