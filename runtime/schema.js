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

  equals(otherSchema) {
    return this === otherSchema || (this.name == otherSchema.name
       // TODO: Check equality without calling contains.
       && this.contains(otherSchema)
       && otherSchema.contains(this));
  }

  contains(otherSchema) {
    if (!this.containsAncestry(otherSchema)) {
      return false;
    }
    for (let section of ['normative', 'optional']) {
      let thisSection = this[section];
      let otherSection = otherSchema[section];
      for (let field in otherSection) {
        if (thisSection[field] != otherSection[field]) {
          return false;
        }
      }
    }
    return true;
  }
  containsAncestry(otherSchema) {
    if (this.name == otherSchema.name || otherSchema.name == null) {
      nextOtherParent: for (let otherParent of otherSchema.parents) {
        for (let parent of this.parents) {
          if (parent.containsAncestry(otherParent)) {
            continue nextOtherParent;
          }
        }
        return false;
      }
      return true;
    } else {
      for (let parent of this.parents) {
        if (parent.containsAncestry(otherSchema)) {
          return true;
        }
      }
      return false;
    }
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
    let typeMap = {
      'Text': 'string',
      'URL': 'string',
      'Number': 'number',
      'Boolean': 'boolean',
      'Object': 'object',
    };

    let validateFieldAndTypes = (op, name, value) => {
      let fieldType = normative[name] || optional[name];
      if (fieldType === undefined) {
        throw new Error(`Can't ${op} field ${name}; not in schema ${className}`);
      }
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(fieldType)) {
        for (let t of fieldType) {
          let jsType = typeMap[t];
          if (jsType === undefined) {
            throw new Error(`Unknown field type ${t} in schema ${className}`);
          }
          if (typeof(value) === jsType) {
            return;
          }
        }
        throw new TypeError(
            `Type mismatch ${op}ting field ${name} (union ${fieldType}); ` +
            `value ${value} is type ${typeof(value)}`);
      }

      let jsType = typeMap[fieldType];
      if (jsType === undefined) {
        throw new Error(`Unknown field type ${fieldType} in schema ${className}`);
      }
      if (typeof(value) !== jsType) {
        throw new TypeError(
            `Type mismatch ${op}ting field ${name} (type ${fieldType}); ` +
            `value ${value} is type ${typeof(value)}`);
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
    results.push(`schema ${this.name}`.concat(this.parent ? ` extends ${this.parent.name}` : ''));

    let propertiesToString = (properties, keyword) => {
      if (Object.keys(properties).length > 0) {
        results.push(`  ${keyword}`);
        Object.keys(properties).forEach(name => {
          let schemaType = Array.isArray(properties[name]) && properties[name].length > 1 ? `(${properties[name].join(' or ')})` : properties[name];
          results.push(`    ${schemaType} ${name}`);
        });
      }
    };

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
