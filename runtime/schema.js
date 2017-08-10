/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const Entity = require("./entity.js");
const assert = require('assert');
const Type = require('./type.js');

class Schema {
  constructor(model) {
    this._model = model;
    this.name = model.name;
    this.parent = model.parent ? new Schema(model.parent) : null;
    this._normative = {};
    this._optional = {};
    assert(model.sections);
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

  get type() {
    return Type.newEntity(this.toLiteral());
  }

  get normative() {
    var dict = this.parent ? this.parent.normative : {};
    Object.assign(dict, this._normative);
    return dict;
  }

  get optional() {
    var dict = this.parent ? this.parent.optional : {};
    Object.assign(dict, this._optional);
    return dict;
  }

  entityClass() {
    let schema = this;
    const name = this.name;
    var clazz = class extends Entity {
      constructor(data) {
        super();
        this.rawData = data;
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
}

module.exports = Schema;
