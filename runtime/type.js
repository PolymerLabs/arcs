// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import {assert} from '../platform/assert-web.js';

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

export class Type {
  constructor(tag, data) {
    assert(typeof tag == 'string');
    assert(data);
    if (tag == 'Entity') {
      assert(data instanceof Schema);
    }
    if (tag == 'Collection') {
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

    if (this.isCollection) {
      let primitiveType = this.primitiveType();
      let result = primitiveType.mergeTypeVariablesByName(variableMap);
      if (result === primitiveType) {
        return this;
      }
      return result.collectionOf();
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
    if (type1.isCollection && type2.isCollection)
      return Type.unwrapPair(type1.primitiveType(), type2.primitiveType());
    return [type1, type2];
  }


  // TODO: update call sites to use the type checker instead (since they will
  // have additional information about direction etc.)
  equals(type) {
    return TypeChecker.compareTypes({type: this}, {type});
  }

  _applyExistenceTypeTest(test) {
    if (this.isCollection)
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

  // TODO: remove this in favor of a renamed collectionType
  primitiveType() {
    return this.collectionType;
  }

  collectionOf() {
    return Type.newCollection(this);
  }

  resolvedType() {
    if (this.isCollection) {
      let primitiveType = this.primitiveType();
      let resolvedPrimitiveType = primitiveType.resolvedType();
      return primitiveType !== resolvedPrimitiveType ? resolvedPrimitiveType.collectionOf() : this;
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

  canEnsureResolved() {
    if (this.isResolved())
      return true;
    if (this.isInterface)
      return this.interfaceShape.canEnsureResolved();
    if (this.isVariable)
      return this.variable.canEnsureResolved();
    if (this.isCollection)
      return this.primitiveType().canEnsureResolved();
    return true;
  }

  maybeEnsureResolved() {
    if (this.isInterface)
      return this.interfaceShape.maybeEnsureResolved();
    if (this.isVariable)
      return this.variable.maybeEnsureResolved();
    if (this.isCollection)
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
    assert(false, `contains not implemented for ${this}`);
  }

  static _canMergeCanReadSubset(type1, type2) {
    if (type1.canReadSubset && type2.canReadSubset) {
      if (type1.canReadSubset.tag !== type2.canReadSubset.tag)
        return false;
      if (type1.canReadSubset.isEntity)
        return Schema.intersect(type1.canReadSubset.entitySchema, type2.canReadSubset.entitySchema) !== null;
      assert(false, `_canMergeCanReadSubset not implemented for types tagged with ${type1.canReadSubset.tag}`);
    }
    return true;
  }

  static _canMergeCanWriteSuperset(type1, type2) {
    if (type1.canWriteSuperset && type2.canWriteSuperset) {
      if (type1.canWriteSuperset.tag !== type2.canWriteSuperset.tag)
        return false;
      if (type1.canWriteSuperset.isEntity)
        return Schema.union(type1.canWriteSuperset.entitySchema, type2.canWriteSuperset.entitySchema) !== null;

    }
    return true;
  }

  // Tests whether two types' constraints are compatible with each other
  static canMergeConstraints(type1, type2) {
    return Type._canMergeCanReadSubset(type1, type2) && Type._canMergeCanWriteSuperset(type1, type2);
  }

  clone(variableMap) {
    let type = this.resolvedType();
    if (type.isVariable) {
      if (variableMap.has(type.variable)) {
        return new Type('Variable', variableMap.get(type.variable));
      } else {
        let newTypeVariable = TypeVariable.fromLiteral(type.variable.toLiteral());
        variableMap.set(type.variable, newTypeVariable);
        return new Type('Variable', newTypeVariable);
      }
    }
    if (type.data.clone) {
      return new Type(type.tag, type.data.clone(variableMap));
    }
    return Type.fromLiteral(type.toLiteral());
  }

  toLiteral() {
    if (this.isVariable && this.variable.resolution) {
      return this.variable.resolution.toLiteral();
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
      case 'Collection':
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
    if (literal.tag == 'SetView') {
      // TODO: SetView is deprecated, remove when possible.
      literal.tag = 'Collection';
    }
    return new Type(literal.tag, Type._deliteralizer(literal.tag)(literal.data));
  }

  // TODO: is this the same as _applyExistenceTypeTest
  hasProperty(property) {
    if (property(this))
      return true;
    if (this.isCollection)
      return this.collectionType.hasProperty(property);
    return false;
  }

  toString() {
    if (this.isCollection)
      return `[${this.primitiveType().toString()}]`;
    if (this.isEntity)
      return this.entitySchema.toInlineSchemaString();
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
    if (this.isCollection) {
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
      if (this.isCollection && entitySchema.description.plural) {
        return entitySchema.description.plural;
      }
      if (this.isEntity && entitySchema.description.pattern) {
        return entitySchema.description.pattern;
      }
    }

    if (this.isRelation) {
      return JSON.stringify(this.data);
    }
    if (this.isCollection) {
      return `${this.primitiveType().toPrettyString()} List`;
    }
    if (this.isVariable)
      return this.variable.isResolved() ? this.resolvedType().toPrettyString() : `[~${this.name}]`;
    if (this.isEntity) {
      // Spit MyTypeFOO to My Type FOO
      if (this.entitySchema.name) {
        return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, '$1 $2').replace(/([A-Z][^A-Z])/g, ' $1').replace(/[\s]+/g, ' ').trim();
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
addType('Collection', 'type');
addType('Relation', 'entities');
addType('Interface', 'shape');
addType('Tuple', 'fields');

import {Shape} from './shape.js';
import {Schema} from './schema.js';
import {TypeVariable} from './type-variable.js';
import {TupleFields} from './tuple-fields.js';
import {TypeChecker} from './recipe/type-checker.js';
