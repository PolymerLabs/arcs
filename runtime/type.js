// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from '../platform/assert-web.js';

let nextVariableId = 0;

function addType(name, arg) {
  let lowerName = name[0].toLowerCase() + name.substring(1);
  Object.defineProperty(Type, `new${name}`, {
    value: function(arg) {
      return new Type(name, arg);
    }});
  let upperArg = arg ? arg[0].toUpperCase() + arg.substring(1) : '';
  Object.defineProperty(Type.prototype, `${lowerName}${upperArg}`, {
    get: function() {
      if (!this[`is${name}`])
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
    if (tag == 'Constraint') {
      if (!(data instanceof Type) && data.variable && data.type) {
        data = new Constraint(data.variable, data.type);
      }
    }
    this.tag = tag;
    this.data = data;
  }

  static newHandle(type) {
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
      let name = this.data;
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
      let shape = this.interfaceShape.clone();
      shape._typeVars.map(({object, field}) => object[field] = object[field].assignVariableIds(variableMap));
      return Type.newInterface(shape);
    }

    if (this.isConstraint) {
      return Type.newConstraint(new Constraint(
          this.constraint.variable.assignVariableIds(variableMap),
          this.constraint.type.assignVariableIds(variableMap)));
    }

    return this;
  }

  static unwrapPair(type1, type2) {
    assert(type1 instanceof Type);
    assert(type2 instanceof Type);
    while (type1.isConstraint) {
      type1 = type1.constraint.type;
    }
    while (type2.isConstraint) {
      type2 = type2.constraint.type;
    }
    if (type1.isSetView && type2.isSetView)
      return Type.unwrapPair(type1.primitiveType(), type2.primitiveType());
    return [type1, type2];
  }

  // TODO: Figure out how to remove the use of equals. It prevents
  //       various things from being polymorphic.
  equals(type) {
    if (this.tag !== type.tag)
      return false;
    if (this.isEntity) {
      return this.data.equals(type.data);
    }
    if (this.isSetView) {
      return this.data.equals(type.data);
    }
    if (this.isInterface) {
      return this.data.equals(type.data);
    }
    if (this.isVariable) {
      return this.data.equals(type.data);
    }
    if (this.isConstraint) {
      return this.data.equals(type.data);
    }
    // TODO: this doesn't always work with the way the parser keeps kind
    // information around
    return JSON.stringify(this.data) == JSON.stringify(type.data);
  }

  _applyExistenceTypeTest(test) {
    if (this.isSetView)
      return this.primitiveType()._applyExistenceTypeTest(test);
    if (this.isInterface)
      return this.data._applyExistenceTypeTest(test);
    if (this.isConstraint)
      return this.constraint.variable._applyExistenceTypeTest(test)
          && this.constraint.type._applyExistenceTypeTest(test);
    return test(this);
  }

  get hasVariable() {
    return this._applyExistenceTypeTest(type => type.isVariable);
  }

  get hasUnresolvedVariable() {
    return this._applyExistenceTypeTest(type => type.isVariable && !type.variable.isResolved);
  }

  get hasVariableReference() {
    return this._applyExistenceTypeTest(type => type.isVariableReference);
  }

  // TODO: remove this in favor of setViewType?
  primitiveType() {
    return this.setViewType;
  }

  resolveTo(type) {
    if (this.isSetView) {
      this.primitiveType().resolveTo(type.primitiveType());
    } else if (this.isVariable) {
      let resolved = type.resolvedType();
      if (this !== resolved) {
        this.variable.resolution = type.resolvedType();
      }
    } else if (this.isConstraint) {
      this.constraint.variable.resolveTo(type);
    }
  }

  resolvedType() {
    if (this.isSetView) {
      let resolvedPrimitiveType = this.primitiveType().resolvedType();
      return resolvedPrimitiveType ? resolvedPrimitiveType.setViewOf() : this;
    }
    if (this.isVariable && this.data.isResolved) {
      return this.variable.resolution.resolvedType();
    }
    if (this.isConstraint) {
      return this.constraint.type.resolvedType();
    }
    if (this.isInterface) {
      return Type.newInterface(this.data.resolvedType());
    }
    return this;
  }

  isResolved() {
    if (this.isSetView) {
      return this.primitiveType().isResolved();
    }
    if (this.isVariable) {
      return this.data.isResolved;
    }
    if (this.isConstraint) {
      return this.constraint.type.isResolved();
    }
    return true;
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
      case 'Tuple':
        return TupleFields.fromLiteral;
      case 'Variable':
        return TypeVariable.fromLiteral;
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

  // TODO: is this the same as _applyExistenceTypeTest
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
      return this.interfaceShape.name;
    if (this.isTuple)
      return this.tupleFields.toString();
    if (this.isVariableReference)
      return `~${this.data}`;
    if (this.isManifestReference)
      return this.data;
    if (this.isVariable)
      return `~${this.data.name}`;
    assert(false, `Add support to serializing type: ${JSON.stringify(this)}`);
  }

  toPrettyString() {
    if (this.isRelation)
      return JSON.stringify(this.data);
    if (this.isSetView) {
      return `${this.primitiveType().toPrettyString()} List`;
    }
    if (this.isVariable)
      return this.data.isResolved ? this.data.resolution.toPrettyString() : `[~${this.name}]`;
    if (this.isVariableReference)
      return `[${this.variableReferenceName}]`;
    if (this.isEntity) {
      // Spit MyTypeFOO to My Type FOO
      if (this.entitySchema.name) {
        return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, '$1 $2').replace(/([A-Z][^A-Z])/g, ' $1').trim();
      } 
      return JSON.stringify(this.entitySchema._model);
    }
    if (this.isTuple)
      return this.tupleFields.toString();
    if (this.isInterface)
      return this.interfaceShape.toPrettyString();
  }
}

addType('Entity', 'schema');
addType('VariableReference');
addType('Variable');
addType('SetView', 'type');
addType('Relation', 'entities');
addType('Interface', 'shape');
addType('Tuple', 'fields');
addType('Constraint');

class Constraint {
  constructor(variable, type) {
    assert(variable);
    assert(type);
    this.variable = variable;
    this.type = type;
  }

  toLiteral() {
    return {
      variable: this.variable.toLiteral(),
      type: this.type.toLiteral(),
    };
  }

  equals(other) {
    return this.variable.equals(other) && this.type.equals(other);
  }

  static fromLiteral(literal) {
    return new Constraint(
      Type.fromLiteral(literal.variable),
      Type.fromLiteral(literal.type));
  }
}

export default Type;

import Shape from './shape.js';
import Schema from './schema.js';
import TypeVariable from './type-variable.js';
import TupleFields from './tuple-fields.js';