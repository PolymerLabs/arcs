/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from 'assert';

class Schema {
  constructor(model) {
    this._model = model;
    this.name = model.name;
    this.parents = (model.parents || []).map(parent => new Schema(parent));
    this._normative = {};
    this._optional = {};

    assert(model.sections, `${JSON.stringify(model)} should have sections`);
    for (var section of model.sections) {
      var into = section.sectionType == 'normative' ? this._normative : this._optional;
      for (var field in section.fields) {
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
    return this.toLiteral() == otherSchema.toLiteral();
  }

  get type() {
    return Type.newEntity(this);
  }

  get normative() {
    var normative = {};
    for (var parent of this.parents)
      Object.assign(normative, parent.normative);
    Object.assign(normative, this._normative);
    return normative;
  }

  get optional() {
    var optional = {};
    for (var parent of this.parents)
      Object.assign(optional, parent.optional);
    Object.assign(optional, this._optional);
    return optional;
  }

  entityClass() {
    let schema = this;
    const className = this.name;
    var properties = Object.keys(this.normative).concat(Object.keys(this.optional));
    var classJunk = ['toJSON', 'prototype', 'toString', 'inspect'];

    var clazz = class extends Entity {
      constructor(data, userIDComponent) {
        var p = new Proxy(data, {
          get: (target, name) => {
            if (classJunk.includes(name))
              return undefined;
            if (name.constructor == Symbol)
              return undefined;
            if (!properties.includes(name))
              throw new Error(`Can't access field ${name} not in schema ${className}`);
            return target[name];
          },
          set: (target, name, value) => {
            if (!properties.includes(name)) {
              throw new Error(`Can't write field ${name} not in schema ${className}`);
            }
            target[name] = value;
            return true;
          }
        });
        super(userIDComponent);
        this.rawData = p;
      }

      dataClone() {
        var clone = {};
        properties.forEach(prop => clone[prop] = this.rawData[prop]);
        return clone;
      }

      static get key() {
        return {
          tag: 'entity',
          schema: schema.toLiteral(),
        };
      }
    }

    Object.defineProperty(clazz, 'type', {value: this.type});
    Object.defineProperty(clazz, 'name', {value: this.name});
    for (let property in this.normative) {
      // TODO: type checking, make a distinction between normative
      // and optional properties.
      // TODO: add query / getter functions for user properties
      Object.defineProperty(clazz.prototype, property, {
        get: function() {
          return this.rawData[property];
        },
        set: function(v) {
          this.rawData[property] = v;
        }
      });
    }
    for (let property in this.optional) {
      Object.defineProperty(clazz.prototype, property, {
        get: function() {
          return this.rawData[property];
        },
        set: function(v) {
          this.rawData[property] = v;
        }
      });
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
    }

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
