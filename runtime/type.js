// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from 'assert';

let nextVariableId = 0;

function addType(name, arg) {
  var lowerName = name[0].toLowerCase() + name.substring(1);
  Object.defineProperty(Type, `new${name}`, {
    value: function() {
      return new Type(name, arguments[0]);
    }});
  var upperArg = arg ? arg[0].toUpperCase() + arg.substring(1) : '';
  Object.defineProperty(Type.prototype, `${lowerName}${upperArg}`, {
    get: function() {
      assert(this[`is${name}`], `{${this.tag}, ${this.data}} is not of type ${name}`);
      return this.data;
    }});
  Object.defineProperty(Type.prototype, `is${name}`, {
    get: function() {
      return this.tag == name;
    }});
}

class Type {
  constructor(tag, data) {
    assert(typeof tag == 'string');
    assert(data);
    if (tag == 'Entity') {
      assert(data instanceof Schema);
    }
    if (tag == 'SetView') {
      if (!(data instanceof Type) && data.tag && data.data) {
        data = new Type(data.tag, data.data);
      }
    }
    this.tag = tag;
    this.data = data;
  }

  static newView(type) {
    console.warn('Type.newView is deprecated. Please use Type.newSetView instead');
    return Type.newSetView(type);
  }

  get isView() {
    console.warn('Type.isView is deprecated. Please use Type.isSetView instead');
    return this.isSetView;
  }

  get viewType() {
    console.warn('Type.viewType is deprecated. Please use Type.setViewType isntead');
    return this.setViewType;
  }

  viewOf() {
    console.warn('Type.viewOf is deprecated. Please use Type.setViewOf instead');
    return this.setViewOf();
  }

  get manifestReferenceName() {
    console.warn('Type.manifestReferenceName is deprecated. Please use Type.manifestReference instead');
    return this.manifestReference;
  }

  get variableReferenceName() {
    console.warn('Type.variableReferenceName is deprecated. Please use Type.variableReference instead');
    return this.variableReference;
  }

  get variableVariable() {
    console.warn('Type.variableVariable is deprecated. Please use Type.variable instead');
    return this.variable;
  }

  // Replaces variableReference types with variable types .
  assignVariableIds(variableMap) {
    if (this.isVariableReference) {
      var name = this.data;
      let sharedVariable = variableMap.get(name);
      if (sharedVariable == undefined) {
        let id = nextVariableId++;
        sharedVariable = new TypeVariable(name, id);
        variableMap.set(name, sharedVariable);
      }
      return Type.newVariable(sharedVariable);
    }

    if (this.isSetView) {
      return this.primitiveType().assignVariableIds(variableMap).setViewOf();
    }

    if (this.isInterface) {
      var shape = this.interfaceShape.clone();
      shape._typeVars.map(({object, field}) => object[field] = object[field].assignVariableIds(variableMap));
      return Type.newInterface(shape);
    }

    return this;
  }

  // Replaces manifestReference types with resolved schemas.
  resolveReferences(resolve) {
    if (this.isManifestReference) {
      let resolved = resolve(this.data);
      if (resolved.schema) {
        return Type.newEntity(resolved.schema);
      } else if (resolved.shape) {
        return Type.newInterface(resolved.shape);
      } else {
        throw new Error('Expected {shape} or {schema}')
      }
    }

    if (this.isSetView) {
      return this.primitiveType().resolveReferences(resolve).setViewOf();
    }

    return this;
  }

  equals(type) {
    if (this.tag !== type.tag)
      return false;
    if (this.tag == 'Entity') {
      // TODO: Remove this hack that allows the old resolver to match
      //       types by schema name.
      return this.data.name == type.data.name;
    }
    if (this.isSetView) {
      return this.data.equals(type.data);
    }

    if (this.isInterface)
      return this.data.equals(type.data);
    // TODO: this doesn't always work with the way the parser keeps kind
    // information around
    return JSON.stringify(this.data) == JSON.stringify(type.data);
  }

  get isValid() {
    return !this.variableReference;
  }

  primitiveType() {
    var type = this.setViewType;
    return new Type(type.tag, type.data);
  }

  resolvedType() {
    if (this.isTypeVariable && this.data.isResolved)
      return this.data.resolution.resolvedType();

    return this;
  }

  toLiteral() {
    if (this.data.toLiteral)
      return {tag: this.tag, data: this.data.toLiteral()};
    return this;
  }

  static _deliteralizer(tag) {
    switch (tag) {
      case 'Interface':
        return Shape.fromLiteral;
      case 'Entity':
        return Schema.fromLiteral;
      case 'SetView':
        return Type.fromLiteral;
      default:
        return a => a;
    }
  }

  static fromLiteral(literal) {
    return new Type(literal.tag, Type._deliteralizer(literal.tag)(literal.data));
  }

  setViewOf() {
    return Type.newSetView(this);
  }

  hasProperty(property) {
    if (property(this))
      return true;
    if (this.isSetView)
      return this.setViewType.hasProperty(property);
    return false;
  }

  toString() {
    if (this.isSetView)
      return `[${this.primitiveType().toString()}]`;
    if (this.isEntity)
      return this.entitySchema.name;
    if (this.isInterface)
      return 'Interface'
    assert('Add support to serializing type:', this);
  }

  toPrettyString() {
    if (this.isRelation)
      return JSON.stringify(this.data);
    if (this.isSetView) {
      return `${this.primitiveType().toPrettyString()} List`;
    }
    if (this.isVariable)
      return `[${this.variableName}]`;
    if (this.isVariableReference)
      return `[${this.variableReferenceName}]`;
    if (this.isEntity)
      // Spit MyTypeFOO to My Type FOO
      return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, "$1 $2").replace(/([A-Z][^A-Z])/g, " $1").trim();
    if (this.isManifestReference)
      return this.manifestReferenceName;
    if (this.isInterface)
      return this.interfaceShape.toPrettyString();
  }
}

addType('ManifestReference');
addType('Entity', 'schema');
addType('VariableReference');
addType('Variable');
addType('SetView', 'type');
addType('Relation', 'entities');
addType('Interface', 'shape');

export default Type;

import Shape from './shape.js';
import Schema from './schema.js';
import TypeVariable from './type-variable.js';
