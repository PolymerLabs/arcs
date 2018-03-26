// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from '../platform/assert-web.js';

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
    if (tag == 'Variable') {
      if (!(data instanceof TypeVariable)) {
        data = new TypeVariable(data.name, data.constraint);
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

  get variableVariable() {
    console.warn('Type.variableVariable is deprecated. Please use Type.variable instead');
    return this.variable;
  }

  mergeTypeVariablesByName(variableMap) {
    if (this.isVariable) {
      let name = this.variable.name;
      let variable = variableMap.get(name);
      if (!variable) {
        variable = this;
        variableMap.set(name, this);
      } else {
        if (variable.variable.constraint || this.variable.constraint) {
          let mergedConstraint = TypeVariable.maybeMergeConstraints(variable.variable, this.variable);
          if (!mergedConstraint) {
            throw new Error('could not merge type variables');
          }
          variable.variable.constraint = mergedConstraint;
        }
      }
      return variable;
    }

    if (this.isSetView) {
      let primitiveType = this.primitiveType();
      let result = primitiveType.mergeTypeVariablesByName(variableMap);
      if (result === primitiveType) {
        return this;
      }
      return result.setViewOf();
    }

    if (this.isInterface) {
      let shape = this.interfaceShape.clone();
      shape._typeVars.map(({object, field}) => object[field] = object[field].mergeTypeVariablesByName(variableMap));
      // TODO: only build a new type when a variable is modified
      return Type.newInterface(shape);
    }

    return this;
  }

  static unwrapPair(type1, type2) {
    assert(type1 instanceof Type);
    assert(type2 instanceof Type);
    if (type1.isSetView && type2.isSetView)
      return Type.unwrapPair(type1.primitiveType(), type2.primitiveType());
    return [type1, type2];
  }


  // TODO: update call sites to use the type checker instead (since they will
  // have additional information about direction etc.)
  equals(type) {
    return TypeChecker.compareTypes({type: this}, {type}, false).valid;
  }

  _applyExistenceTypeTest(test) {
    if (this.isSetView)
      return this.primitiveType()._applyExistenceTypeTest(test);
    if (this.isInterface)
      return this.data._applyExistenceTypeTest(test);
    return test(this);
  }

  get hasVariable() {
    return this._applyExistenceTypeTest(type => type.isVariable);
  }

  get hasUnresolvedVariable() {
    return this._applyExistenceTypeTest(type => type.isVariable && !type.variable.isResolved());
  }

  get hasVariableReference() {
    return this._applyExistenceTypeTest(type => type.isVariableReference);
  }

  // TODO: remove this in favor of a renamed setViewType
  primitiveType() {
    return this.setViewType;
  }

  resolvedType() {
    if (this.isSetView) {
      let primitiveType = this.primitiveType();
      let resolvedPrimitiveType = primitiveType.resolvedType();
      return primitiveType !== resolvedPrimitiveType ? resolvedPrimitiveType.setViewOf() : this;
    }
    if (this.isVariable) {
      let resolution = this.variable.resolution;
      if (resolution)
        return resolution;
    }
    if (this.isInterface) {
      return Type.newInterface(this.data.resolvedType());
    }
    return this;
  }

  isResolved() {
    // TODO: one of these should not exist.
    return !this.hasUnresolvedVariable;
  }

  maybeEnsureResolved() {
    if (this.isInterface)
      assert(false, `maybeEnsureResolved not implemented for ${this}`);
    if (this.isVariable)
      return this.variable.maybeEnsureResolved();
    if (this.isSetView)
      return this.primitiveType().maybeEnsureResolved();
    return true;
  }

  get canWriteSuperset() {
    if (this.isVariable)
      return this.variable.canWriteSuperset;
    if (this.isEntity)
      return this;
    if (this.isInterface)
      return Type.newInterface(this.interfaceShape.canWriteSuperset);
    assert(false, `canWriteSuperset not implemented for ${this}`);
  }

  get canReadSubset() {
    if (this.isVariable)
      return this.variable.canReadSubset;
    if (this.isEntity)
      return this;
    if (this.isInterface)
      return Type.newInterface(this.interfaceShape.canReadSubset);
    assert(false, `canReadSubset not implemented for ${this}`);
  }

  isMoreSpecificThan(type) {
    if (this.tag !== type.tag)
      return false;
    if (this.isEntity)
      return this.entitySchema.isMoreSpecificThan(type.entitySchema);
    if (this.isInterface)
      return this.interfaceShape.isMoreSpecificThan(type.interfaceShape);
    assert(false, 'contains not implemented for ${this}');
  }

  toLiteral() {
    if (this.isVariable && this.isResolved()) {
      return this.resolvedType().toLiteral();
    }
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

  getEntitySchema() {
    if (this.isSetView) {
      return this.primitiveType().getEntitySchema();
    }
    if (this.isEntity) {
      return this.entitySchema;
    }
    if (this.isVariable) {
      if (this.variable.isResolved()) {
        return this.resolvedType().getEntitySchema();
      }
    }
  }

  toPrettyString() {
    // Try extract the description from schema spec.
    let entitySchema = this.getEntitySchema();
    if (entitySchema) {
      if (this.isSetView && entitySchema.description.plural) {
        return entitySchema.description.plural;
      }
      if (this.isEntity && entitySchema.description.pattern) {
        return entitySchema.description.pattern;
      }
    }

    if (this.isRelation) {
      return JSON.stringify(this.data);
    }
    if (this.isSetView) {
      return `${this.primitiveType().toPrettyString()} List`;
    }
    if (this.isVariable)
      return this.variable.isResolved() ? this.resolvedType().toPrettyString() : `[~${this.name}]`;
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
addType('Variable');
addType('SetView', 'type');
addType('Relation', 'entities');
addType('Interface', 'shape');
addType('Tuple', 'fields');

export default Type;

import Shape from './shape.js';
import Schema from './schema.js';
import TypeVariable from './type-variable.js';
import TupleFields from './tuple-fields.js';
import TypeChecker from './recipe/type-checker.js';

