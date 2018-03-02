/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from '../platform/assert-web.js';

class Schema {
  constructor(model) {
    this._model = model;
    this.name = model.name;
    this.parents = (model.parents || []).map(parent => new Schema(parent));
    this._normative = {};
    this._optional = {};

    assert(model.sections, `${JSON.stringify(model)} should have sections`);
    for (let section of model.sections) {
      let into = section.sectionType == 'normative' ? this._normative : this._optional;
      for (let field in section.fields) {
        // TODO normalize field types here?
        into[field] = section.fields[field];
      }
    }
  }

  toLiteral() {
    return this._model;
  }

  static fromLiteral(data) {
    return new Schema(data);
  }

  * _fields() {
    for (let field in this.normative) {
      yield {field, type: this.normative[field]};
    }
    for (let field in this.optional) {
      yield {field, type: this.optional[field]};
    }
  }

  static _typesEqual(fieldType1, fieldType2) {
    // TODO: structural check instead of JSON.
    return JSON.stringify(fieldType1) == JSON.stringify(fieldType2);
  }

  static maybeMerge(schema1, schema2) {
    if (!schema1.hasCommonName(schema2)) {
      return null;
    }

    let names = [...new Set(...schema1._names(), ...schema2._names())];
    let fields = {};

    for (let {field, type} of [...schema1._fields(), ...schema2._fields()]) {
      if (fields[field]) {
        if (!Schema._typesEqual(fields[field], type)) {
          return null;
        }
      } else {
        fields[field] = type;
      }
    }

    return new Schema({
      name: names.length ? names[0] : null,
      fields,
      parents: names.slice(1).map(name => ({
        name,
        parents: [],
        sections: [],
      })),
      sections: [{
        sectionType: 'optional',
        fields: {},
      }],
    });
  }

  equals(otherSchema) {
    return this === otherSchema || (this.name == otherSchema.name
       // TODO: Check equality without calling contains.
       && this.contains(otherSchema)
       && otherSchema.contains(this));
  }

  contains(otherSchema) {
    if (!this._containsNames(otherSchema)) {
      return false;
    }
    for (let section of ['normative', 'optional']) {
      let thisSection = this[section];
      let otherSection = otherSchema[section];
      for (let field in otherSection) {
        if (!Schema._typesEqual(thisSection[field], otherSection[field])) {
          return false;
        }
      }
    }
    return true;
  }

  * _names() {
    if (this.name)
      yield this.name;
    for (let parent of this.parents) {
      yield* parent._names();
    }
  }

  _containsNames(schema) {
    // TODO: backwards?
    let names = new Set(this._names());
    for (let name of schema._names()) {
      if (!names.has(name)) {
        return false;
      }
    }
    return true;
  }

  hasCommonName(otherSchema) {
    if (!this.name || !otherSchema.name)
      return true;
    let otherNames = new Set(names(otherSchema));
    for (let name of names(this)) {
      if (otherNames.has(name)) {
        return true;
      }
    }
    return false;
  }

  get type() {
    return Type.newEntity(this);
  }

  get normative() {
    let normative = {};
    for (let parent of this.parents)
      Object.assign(normative, parent.normative);
    Object.assign(normative, this._normative);
    return normative;
  }

  get optional() {
    let optional = {};
    for (let parent of this.parents)
      Object.assign(optional, parent.optional);
    Object.assign(optional, this._optional);
    return optional;
  }

  entityClass() {
    let schema = this;
    let className = this.name;
    let normative = this.normative;
    let optional = this.optional;
    let classJunk = ['toJSON', 'prototype', 'toString', 'inspect'];

    let convertToJsType = fieldType => {
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

    let validateFieldAndTypes = (op, name, value) => {
      let fieldType = normative[name] || optional[name];
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
          for (let innerType of fieldType.types) {
            if (typeof(value) === convertToJsType(innerType)) {
              return;
            }
          }
          throw new TypeError(
              `Type mismatch ${op}ting field ${name} (union [${fieldType.types}]); ` +
              `value '${value}' is type ${typeof(value)}`);
          break;

        case 'schema-tuple':
          // Value must be an array whose contents match each of the tuple types.
          if (!Array.isArray(value)) {
            throw new TypeError(`Cannot ${op} tuple ${name} with non-array value '${value}'`);
          }
          if (value.length != fieldType.types.length) {
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

        default:
          throw new Error(`Unknown kind ${kind} in schema ${className}`);
      }
    };

    let clazz = class extends Entity {
      constructor(data, userIDComponent) {
        super(userIDComponent);
        this.rawData = new Proxy({}, {
          get: (target, name) => {
            if (classJunk.includes(name) || name.constructor == Symbol) {
              return undefined;
            }
            let value = target[name];
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
        for (let [name, value] of Object.entries(data)) {
          this.rawData[name] = value;
        }
      }

      dataClone() {
        let clone = {};
        for (let propertyList of [normative, optional]) {
          Object.keys(propertyList).forEach(prop => {
            if (this.rawData[prop] !== undefined)
              clone[prop] = this.rawData[prop];
          });
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
    // TODO: make a distinction between normative and optional properties.
    // TODO: add query / getter functions for user properties
    for (let propertyList of [normative, optional]) {
      for (let property in propertyList) {
        Object.defineProperty(clazz.prototype, property, {
          get: function() {
            return this.rawData[property];
          },
          set: function(v) {
            this.rawData[property] = v;
          }
        });
      }
    }
    return clazz;
  }

  toString() {
    let results = [];
    this.parents.forEach(parent => results.push(parent.toString()));
    results.push(`schema ${this.name}`.concat(this.parents.length > 0 ? ` extends ${this.parents.map(p => p.name).join(',')}` : ''));

    let propertiesToString = (properties, keyword) => {
      if (Object.keys(properties).length > 0) {
        results.push(`  ${keyword}`);
        Object.keys(properties).forEach(name => {
          let property = properties[name];
          let schemaType;
          if (typeof(property) === 'object') {
            switch (property.kind) {
              case 'schema-union':
                schemaType = `(${property.types.join(' or ')})`;
                break;
              case 'schema-tuple':
                schemaType = `(${property.types.join(', ')})`;
                break;
              default:
                throw new Error(`Unknown kind ${property.kind} in schema ${this.name}`);
            }
          } else {
            schemaType = property;
          }
          results.push(`    ${schemaType} ${name}`);
        });
      }
    };

    // TODO: skip properties that already written as part of parent schema serialization?
    propertiesToString(this.normative, 'normative');
    propertiesToString(this.optional, 'optional');
    return results.join('\n');
  }

  toManifestString() {
    return this.toString();
  }
}

export default Schema;

import Type from './type.js';
import Entity from './entity.js';
