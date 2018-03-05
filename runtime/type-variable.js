// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import Type from './type.js';
import assert from '../platform/assert-web.js';
import Schema from './schema.js';

class TypeVariable {
  constructor(name, constraint) {
    assert(typeof name == 'string');
    assert(constraint == null || constraint instanceof Type);
    this.name = name;
    this._constraint = constraint;
    this._resolution = null;
  }


  static maybeMergeConstraints(variable1, variable2) {
    assert(variable1 instanceof TypeVariable);
    assert(variable2 instanceof TypeVariable);

    let constraint1 = variable1.constraint;
    let constraint2 = variable2.constraint;

    if (constraint1 && constraint2) {
      if (!constraint1.isEntity || !constraint2.isEntity) {
        throw new Error('merging constraints not implemented for ${constraint1.type} and ${constraint2.type}');
      }
  
      let mergedSchema = Schema.maybeMerge(constraint1.entitySchema, constraint2.entitySchema);
      if (!mergedSchema) {
        return null;
      }
      return Type.newEntity(mergedSchema);
    } else {
      return constraint1 || constraint2;
    }
  }

  tryMergeFrom(other) {
    assert(other instanceof TypeVariable);

    let constraint1 = this.constraint;
    let constraint2 = other.constraint;

    if (constraint1 && constraint2) {
      if (!constraint1.isEntity || !constraint2.isEntity) {
        throw new Error('merging constraints not implemented for ${constraint1.type} and ${constraint2.type}');
      }
  
      let mergedSchema = Schema.maybeMerge(constraint1.entitySchema, constraint2.entitySchema);
      if (!mergedSchema) {
        return false;
      }
      this.constraint = Type.newEntity(mergedSchema);
    } else {
      this.constraint = constraint1 || constraint2;
    }
    return true;
  }

  isSatisfiedBy(type) {
    let constraint = this.constraint;
    if (!constraint) {
      return true;
    }
    if (!constraint.isEntity || !type.isEntity) {
      throw new Error('constraint checking not implemented for ${constraint1.type} and ${constraint2.type}');
    }
    return type.entitySchema.contains(constraint.entitySchema);
  }

  get resolution() {
    if (this._resolution) {
      return this._resolution.resolvedType();
    }
    return null;
  }

  set resolution(value) {
    assert(value instanceof Type);
    assert(!this._resolution);
    this._resolution = value;
    this._constraint = null;
  }

  get constraint() {
    if (this._resolution) {
      assert(!this._constraint);
      if (this._resolution.isVariable) {
        return this._resolution.variable.constraint;
      }
      return null;
    }
    return this._constraint;
  }

  set constraint(value) {
    assert(!this._resolution);
    this._constraint = value;
  }

  toLiteral() {
    assert(this.resolution == null);
    return {
      name: this.name,
      constraint: this._constraint && this._constraint.toLiteral(),
    };
  }

  static fromLiteral(data) {
    return new TypeVariable(
        data.name,
        data.constraint ? Type.fromLiteral(data.constraint) : null);
  }

  isResolved() {
    return this._resolution && this._resolution.isResolved();
  }
}

export default TypeVariable;
