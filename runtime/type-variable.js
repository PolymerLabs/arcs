// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import {Type} from './type.js';
import {assert} from '../platform/assert-web.js';
import {Schema} from './schema.js';

export class TypeVariable {
  constructor(name, canWriteSuperset, canReadSubset) {
    assert(typeof name == 'string');
    assert(canWriteSuperset == null || canWriteSuperset instanceof Type);
    assert(canReadSubset == null || canReadSubset instanceof Type);
    this.name = name;
    this._canWriteSuperset = canWriteSuperset;
    this._canReadSubset = canReadSubset;
    this._resolution = null;
  }

  // Merge both the read subset (upper bound) and write superset (lower bound) constraints
  // of two variables together. Use this when two separate type variables need to resolve
  // to the same value.
  maybeMergeConstraints(variable) {
    assert(variable instanceof TypeVariable);

    if (!this.maybeMergeCanReadSubset(variable.canReadSubset))
      return false;
    return this.maybeMergeCanWriteSuperset(variable.canWriteSuperset);
  }

  // merge a type variable's read subset (upper bound) constraints into this variable.
  // This is used to accumulate read constraints when resolving a handle's type.
  maybeMergeCanReadSubset(constraint) {
    if (constraint == null)
      return true;
    
    if (this.canReadSubset == null) {
      this.canReadSubset = constraint;
      return true;
    }

    let mergedSchema = Schema.intersect(this.canReadSubset.entitySchema, constraint.entitySchema);
    if (!mergedSchema)
      return false;
    
    this.canReadSubset = Type.newEntity(mergedSchema);
    return true;
  }

  // merge a type variable's write superset (lower bound) constraints into this variable.
  // This is used to accumulate write constraints when resolving a handle's type.
  maybeMergeCanWriteSuperset(constraint) {
    if (constraint == null)
      return true;

    if (this.canWriteSuperset == null) {
      this.canWriteSuperset = constraint;
      return true;
    }

    let mergedSchema = Schema.union(this.canWriteSuperset.entitySchema, constraint.entitySchema);
    if (!mergedSchema)
      return false;

    this.canWriteSuperset = Type.newEntity(mergedSchema);
    return true;
  }

  isSatisfiedBy(type) {
    let constraint = this._canWriteSuperset;
    if (!constraint) {
      return true;
    }
    if (!constraint.isEntity || !type.isEntity) {
      throw new Error(`constraint checking not implemented for ${this} and ${type}`);
    }
    return type.entitySchema.isMoreSpecificThan(constraint.entitySchema);
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
    let probe = value;
    while (probe) {
      if (!probe.isVariable)
        break;
      if (probe.variable == this)
        return;
      probe = probe.resolution;
    }

    this._resolution = value;
    this._canWriteSuperset = null;
    this._canReadSubset = null;
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

  canEnsureResolved() {
    if (this._resolution)
      return this._resolution.canEnsureResolved();
    if (this._canWriteSuperset || this._canReadSubset)
      return true;
    return false;
  }

  maybeEnsureResolved() {
    if (this._resolution)
      return this._resolution.maybeEnsureResolved();
    if (this._canWriteSuperset) {
      this._resolution = this._canWriteSuperset;
      return true;
    }
    if (this._canReadSubset) {
      this._resolution = this._canReadSubset;
      return true;
    }
    return false;
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
