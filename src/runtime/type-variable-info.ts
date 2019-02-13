// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../platform/assert-web.js';

import {Schema} from './schema.js';
import {EntityType, SlotType, Type, TypeVariable} from './type.js';

export class TypeVariableInfo {
  name: string;
  _canWriteSuperset?: Type;
  _canReadSubset?: Type;
  _resolution?: Type;

  constructor(name: string, canWriteSuperset?: Type, canReadSubset?: Type) {
    this.name = name;
    this._canWriteSuperset = canWriteSuperset;
    this._canReadSubset = canReadSubset;
    this._resolution = null;
  }

  /**
   * Merge both the read subset (upper bound) and write superset (lower bound) constraints
   * of two variables together. Use this when two separate type variables need to resolve
   * to the same value.
   */
  maybeMergeConstraints(variable: TypeVariableInfo) {
    if (!this.maybeMergeCanReadSubset(variable.canReadSubset)) {
      return false;
    }
    return this.maybeMergeCanWriteSuperset(variable.canWriteSuperset);
  }

  /**
   * Merge a type variable's read subset (upper bound) constraints into this variable.
   * This is used to accumulate read constraints when resolving a handle's type.
   */
  maybeMergeCanReadSubset(constraint): boolean {
    if (constraint == null) {
      return true;
    }

    if (this.canReadSubset == null) {
      this.canReadSubset = constraint;
      return true;
    }

    if (this.canReadSubset instanceof SlotType && constraint instanceof SlotType) {
      // TODO: formFactor compatibility, etc.
      return true;
    }

    const mergedSchema = Schema.intersect(this.canReadSubset.entitySchema, constraint.entitySchema);
    if (!mergedSchema) {
      return false;
    }

    this.canReadSubset = new EntityType(mergedSchema);
    return true;
  }

  /**
   * merge a type variable's write superset (lower bound) constraints into this variable.
   * This is used to accumulate write constraints when resolving a handle's type.
   */
  maybeMergeCanWriteSuperset(constraint): boolean {
    if (constraint == null) {
      return true;
    }

    if (this.canWriteSuperset == null) {
      this.canWriteSuperset = constraint;
      return true;
    }

    if (this.canWriteSuperset instanceof SlotType && constraint instanceof SlotType) {
      // TODO: formFactor compatibility, etc.
      return true;
    }

    const mergedSchema = Schema.union(this.canWriteSuperset.entitySchema, constraint.entitySchema);
    if (!mergedSchema) {
      return false;
    }

    this.canWriteSuperset = new EntityType(mergedSchema);
    return true;
  }

  isSatisfiedBy(type) {
    const constraint = this._canWriteSuperset;
    if (!constraint) {
      return true;
    }
    if (!(constraint instanceof EntityType) || !(type instanceof EntityType)) {
      throw new Error(`constraint checking not implemented for ${this} and ${type}`);
    }
    return type.getEntitySchema().isMoreSpecificThan(constraint.getEntitySchema());
  }

  get resolution() {
    if (this._resolution) {
      return this._resolution.resolvedType();
    }
    return null;
  }

  isValidResolutionCandidate(value: Type): {result: boolean, detail?: string} {
    const elementType = value.resolvedType().getContainedType();
    if (elementType instanceof TypeVariable && elementType.variable === this) {
      return {result: false, detail: 'variable cannot resolve to collection of itself'};
    }
    return {result: true};
  }

  set resolution(value: Type) {
    assert(!this._resolution);

    const isValid = this.isValidResolutionCandidate(value);
    assert(isValid.result, isValid.detail);

    let probe = value;
    while (probe) {
      if (!(probe instanceof TypeVariable)) {
        break;
      }
      if (probe.variable === this) {
        return;
      }
      probe = probe.variable.resolution;
    }

    this._resolution = value;
    this._canWriteSuperset = null;
    this._canReadSubset = null;
  }

  get canWriteSuperset() {
    if (this._resolution) {
      assert(!this._canWriteSuperset);
      if (this._resolution instanceof TypeVariable) {
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
      if (this._resolution instanceof TypeVariable) {
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

  get hasConstraint() {
    return this._canReadSubset !== null || this._canWriteSuperset !== null;
  }

  canEnsureResolved() {
    if (this._resolution) {
      return this._resolution.canEnsureResolved();
    }
    if (this._canWriteSuperset || this._canReadSubset) {
      return true;
    }
    return false;
  }

  maybeEnsureResolved() {
    if (this._resolution) {
      return this._resolution.maybeEnsureResolved();
    }
    if (this._canWriteSuperset) {
      this.resolution = this._canWriteSuperset;
      return true;
    }
    if (this._canReadSubset) {
      this.resolution = this._canReadSubset;
      return true;
    }
    return false;
  }

  toLiteral() {
    assert(this.resolution == null);
    return this.toLiteralIgnoringResolutions();
  }

  toLiteralIgnoringResolutions() {
    return {
      name: this.name,
      canWriteSuperset: this._canWriteSuperset && this._canWriteSuperset.toLiteral(),
      canReadSubset: this._canReadSubset && this._canReadSubset.toLiteral()
    };
  }

  static fromLiteral(data) {
    return new TypeVariableInfo(
        data.name,
        data.canWriteSuperset ? Type.fromLiteral(data.canWriteSuperset) : null,
        data.canReadSubset ? Type.fromLiteral(data.canReadSubset) : null);
  }

  isResolved() {
    return (this._resolution && this._resolution.isResolved());
  }
}
