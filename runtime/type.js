// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const assert = require('assert');

let nextVariableId = 0;

function addType(name, tag, args) {
  var lowerName = name[0].toLowerCase() + name.substring(1);
  if (args.length == 1) {
    Object.defineProperty(Type, `new${name}`, {
      value: function() {
        return new Type(tag, arguments[0]);
      }});
    var upperArg = args[0][0].toUpperCase() + args[0].substring(1);
    Object.defineProperty(Type.prototype, `${lowerName}${upperArg}`, {
      get: function() {
        assert(this[`is${name}`]);
        return this.data;
      }});
  } else {
    Object.defineProperty(Type, `new${name}`, {
      value: function() {
        var data = {};
        for (var i = 0; i < args.length; i++)
          data[args[i]] = arguments[i];
        return new Type(tag, data);
      }});
    for (var arg of args) {
      var upperArg = arg[0].toUpperCase() + arg.substring(1);
      Object.defineProperty(Type.prototype, `${lowerName}${upperArg}`, {
        get: function() {
          assert(this[`is${name}`]);
          return this.data[arg];
        }});
    }
  }
  Object.defineProperty(Type.prototype, `is${name}`, {
    get: function() {
      return this.tag == tag;
    }});
}

class Type {
  constructor(tag, data) {
    assert(typeof tag == 'string');
    assert(data);
    if (tag == 'entity')
      assert(data.tag == undefined);
    if (tag == 'list') {
      if (!(data instanceof Type) && data.tag && data.data) {
        data = new Type(data.tag, data.data);
      }
    }
    this.tag = tag;
    this.data = data;
  }

  // TODO: Replace these static functions with operations on Types directly.
  // Replaces 'prevariable' types with 'variable'+id types .
  assignVariableIds(variableMap) {
    if (this.isVariableReference) {
      var name = this.data.name;
      var id = variableMap.get(name);
      if (id == undefined) {
        id = nextVariableId++;
        variableMap.set(name, id);
      }
      return Type.newVariable(name, id);
    }

    if (this.isView) {
      return this.primitiveType().assignVariableIds(variableMap).viewOf();
    }

    return this;
  }

  // Replaces raw strings with resolved schemas.
  resolveSchemas(resolveSchema) {
    if (this.isEntityReference) {
      // TODO: This should probably all happen during type construction so that
      //       we can cache the schema objet.
      return Type.newEntity(resolveSchema(this.data).toLiteral());
    }

    if (this.isView) {
      return this.primitiveType().resolveSchemas(resolveSchema).viewOf();
    }

    return this;
  }

  equals(type) {
    if (this.tag !== type.tag)
      return false;
    if (this.tag == 'entity') {
      // TODO: Remove this hack that allows the old resolver to match
      //       types by schema name.
      return this.data.name == type.data.name;
    }
    if (this.isView) {
      return this.data.equals(type.data);
    }
    return JSON.stringify(this.data) == JSON.stringify(type.data);
  }

  get isValid() {
    return !this.variableReference;
  }

  primitiveType() {
    var type = this.viewType;
    return new Type(type.tag, type.data);
  }

  toLiteral() {
    return this;
  }

  static fromLiteral(literal) {
    return new Type(literal.tag, literal.data);
  }

  viewOf() {
    return Type.newView(this);
  }

  toString() {
    if (this.isView)
      return `[${this.primitiveType().toString()}]`;
    if (this.isEntity)
      return this.entitySchema.name;
    assert('Add support to serializing type:', type);
  }

  toPrettyString() {
    if (this.isRelation)
      return JSON.stringify(this.data);
    if (this.isView) {
      return `${this.primitiveType().toPrettyString()} List`;
    }
    if (this.isVariable)
      return `[${this.variableName}]`;
    if (this.isVariableReference)
      return `[${this.variableReferenceName}]`;
    if (this.isEntity)
      // Spit MyTypeFOO to My Type FOO
      return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, "$1 $2").replace(/([A-Z][^A-Z])/g, " $1").trim();
    if (this.isEntityReference)
      return this.entityReferenceName;
  }
}

addType('EntityReference', 'entityReference', ['name']);
addType('Entity', 'entity', ['schema']);
addType('VariableReference', 'variableReference', ['name']);
addType('Variable', 'variable', ['name', 'id']);
addType('View', 'list', ['type']);
addType('Relation', 'relation', ['entities']);

module.exports = Type;
