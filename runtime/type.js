// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');
const typeLiteral = require('./type-literal.js');

let nextVariableId = 0;
class Type {
  constructor(key) {
    assert(typeof key != 'string')
    assert(!typeLiteral.isNamedVariable(key));
    this.key = key;
  }

  // Replaces 'prevariable' types with 'variable'+id types .
  static assignVariableIds(literal, variableMap) {
    if (typeof literal == 'string') {
      return literal;
    } else switch (literal.tag) {
      case 'list':
        return {
          tag: 'list',
          type: Type.assignVariableIds(literal.type, variableMap),
        };
      case 'prevariable':
        // TODO: It seems wrong to assign these IDs to a particle-spec.
        //       They should be unique per particle instance.
        var id = variableMap.get(literal.name);
        if (id == undefined) {
          id = {
            tag: 'variable',
            id: nextVariableId++,
            name: literal.name
          }
          variableMap.set(literal.name, id);
        }
        return id;
      case 'variable':
        return literal;
      case 'entity':
        return literal;
      default:
        throw new Error(`Unexpected type literal: ${JSON.stringify(literal)}`);
    }
  }

  // Replaces raw strings with resolved schemas.
  static resolveSchemas(literal, resolveSchema) {
    if (typeof literal == 'string') {
      // TODO: This should probably all happen during type construction so that
      //       we can cache the schema objet.
      return {
        tag: 'entity',
        schema: resolveSchema(literal).toLiteral(),
      };
    } else switch (literal.tag) {
      case 'list':
        return {
          tag: 'list',
          type: Type.resolveSchemas(literal.type, resolveSchema),
        };
      case 'prevariable':
        return literal;
      case 'variable':
        return literal;
      case 'entity':
        return literal;
      default:
        throw new Error(`Unexpected type literal: ${JSON.stringify(literal)}`);
    }
  }

  equals(type) {
    if (this.key.tag == 'entity' && type.key.tag == 'entity') {
      // TODO: Remove this hack that allows the old resolver to match
      //       types by schema name.
      return this.key.schema.name == type.key.schema.name;
    }
    return typeLiteral.equal(type.toLiteral(), this.toLiteral());
  }
  get isRelation() {
    return typeLiteral.isRelation(this.key);
  }
  get isView() {
    return typeLiteral.isView(this.key);
  }
  get isVariable() {
    return typeLiteral.isVariable(this.key);
  }

  get isEntity() {
    return typeLiteral.isEntity(this.key);
  }

  get hasVariable() {
    return typeLiteral.hasVariable(this.key);
  }

  get isValid() {
    return !typeLiteral.isNamedVariable(this.key);
  }

  primitiveType() {
    return new Type(typeLiteral.primitiveType(this.key));
  }
  get schema() {
    assert(this.isEntity);
    return this.key.schema;
  }
  toLiteral() {
    assert(typeof this.key != 'string');
    return this.key;
  }
  static fromLiteral(literal) {
    return new Type(literal);
  }

  viewOf() {
    return new Type(typeLiteral.viewOf(this.key));
  }

  get variableID() {
    return typeLiteral.variableID(this.key);
  }

  static typeVariable(name) {
    return new Type(typeLiteral.typeVariable(name));
  }

  toString() {
    return typeLiteral.stringFor(this.key);
  }

}

module.exports = Type;
