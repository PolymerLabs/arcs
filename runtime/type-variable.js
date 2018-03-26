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
import TypeChecker from './recipe/type-checker.js';

class TypeVariable {
  constructor(name, canWriteSuperset, canReadSubset) {
    assert(typeof name == 'string');
    assert(canWriteSuperset == null || canWriteSuperset instanceof Type);
    assert(canReadSubset == null || canReadSubset instanceof Type);
    this.name = name;
    this._canWriteSuperset = canWriteSuperset;
    this._canReadSubset = canReadSubset;
    this._resolution = null;
  }


  static _maybeMergeConstraints(variable1, variable2) {
    assert(variable1 instanceof TypeVariable);
    assert(variable2 instanceof TypeVariable);

    let canWriteSuperset;
    if (variable2._canWriteSuperset) {
      canWriteSuperset = TypeVariable._maybeMergeConstraintPair(variable1._canWriteSuperset, variable2._canWriteSuperset);
      if (canWriteSuperset == null)
        return null;
    } else {
      canWriteSuperset = variable1._canWriteSuperset;
    }

    let canReadSubset;
    if (variable2._canReadSubset) {
      canReadSubset = TypeVariable._maybeMergeConstraintPair(variable1._canReadSubset, variable2._canReadSubset);
      if (canReadSubset == null)
        return null;
    } else {
      canReadSubset = variable1._canReadSubset;
    }

    return {canWriteSuperset, canReadSubset};
  }

  static _maybeMergeConstraintPair(constraint1, constraint2) {
    assert(constraint1 || constraint2);

    if (constraint1 && constraint2) {
      if (!constraint1.isEntity || !constraint2.isEntity) {
        throw new Error(`merging constraints not implemented for ${constraint1.type} and ${constraint2.type}`);
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

  maybeMergeConstraints(variable) {
    let result = TypeVariable._maybeMergeConstraints(this, variable);
    if (result == null)
      return false;
    this.canReadSubset = result.canReadSubset;
    this.canWriteSuperset = result.canWriteSuperset;
    return true;
  }

  maybeMergeCanReadSubset(constraint) {
    if (constraint == null)
      return true;
    
    if (this.canReadSubset == null) {
      this.canReadSubset = constraint;
      assert(this.canReadSubset !== undefined);      
      return true;
    }

    if (!this.canReadSubset.isEntity || !constraint.isEntity)
      throw new Error(`merging read subsets not implemented for ${this.canReadSubset.type} and ${constraint.type}`);
    
    let mergedSchema = Schema.intersect(this.canReadSubset.entitySchema, constraint.entitySchema);
    if (!mergedSchema)
      return false;
    
    this.canReadSubset = Type.newEntity(mergedSchema);
    assert(this.canReadSubset !== undefined);
    return true;
  }

  maybeMergeCanWriteSuperset(constraint) {
    if (constraint == null)
      return true;
    let result = TypeVariable._maybeMergeConstraintPair(this.canWriteSuperset, constraint);
    if (result == null)
      return false;
    this.canWriteSuperset = result;
    return true;
  }

  isSatisfiedBy(type) {
    let constraint = this._canWriteSuperset;
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
    this._canWriteSuperset = null;
  }

  get canWriteSuperset() {
    if (this._resolution) {
      assert(!this._canWriteSuperset);
      if (this._resolution.isVariable) {
        return this._resolution.variable.canWriteSuperset;
      }
      return null;
    }
    return this._canWriteSuperset;
  }

  set canWriteSuperset(value) {
    assert(!this._resolution);
    this._canWriteSuperset = value;
  }

  get canReadSubset() {
    if (this._resolution) {
      assert(!this._canReadSubset);
      if (this._resolution.isVariable) {
        return this._resolution.variable.canReadSubset;
      }
      return null;
    }
    return this._canReadSubset;
  }

  set canReadSubset(value) {
    assert(!this._resolution);
    this._canReadSubset = value;
  }

  toLiteral() {
    assert(this.resolution == null);
    return {
      name: this.name,
      canWriteSuperset: this._canWriteSuperset && this._canWriteSuperset.toLiteral(),
      canReadSubset: this._canReadSubset && this._canReadSubset.toLiteral()
    };
  }

  static fromLiteral(data) {
    return new TypeVariable(
        data.name,
        data.canWriteSuperset ? Type.fromLiteral(data.canWriteSuperset) : null,
        data.canReadSubset ? Type.fromLiteral(data.canReadSubset) : null);
  }

  isResolved() {
    return (this._resolution && this._resolution.isResolved());
  }
}

export default TypeVariable;
