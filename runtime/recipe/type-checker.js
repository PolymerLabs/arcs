// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Type} from '../type.js';
import {TypeVariable} from '../type-variable.js';
import {assert} from '../../platform/assert-web.js';

export class TypeChecker {

  // resolve a list of handleConnection types against a handle
  // base type. This is the core type resolution mechanism, but should only
  // be used when types can actually be associated with each other / constrained.
  //
  // By design this function is called exactly once per handle in a recipe during
  // normalization, and should provide the same final answers regardless of the
  // ordering of handles within that recipe
  //
  // NOTE: you probably don't want to call this function, if you think you
  // do, talk to shans@.
  static processTypeList(baseType, list) {
    baseType = baseType == undefined
        ? Type.newVariable(new TypeVariable('a'))
        : Type.fromLiteral(baseType.toLiteral()); // Copy for mutating.
    
    let concreteTypes = [];

    // baseType might be a variable (and is definitely a variable if no baseType was available).
    // Some of the list might contain variables too.

    // First attempt to merge all the variables into the baseType
    //
    // If the baseType is a variable then this results in a single place to manipulate the constraints
    // of all the other connected variables at the same time.
    for (let item of list) {
      if (item.type.resolvedType().hasVariable) {
        baseType = TypeChecker._tryMergeTypeVariable(baseType, item.type);
        if (baseType == null)
          return null;
      } else {
        concreteTypes.push(item);
      }
    }

    for (let item of concreteTypes) {
      let success = TypeChecker._tryMergeConstraints(baseType, item);
      if (!success)
        return null;
    }

    let getResolution = candidate => {
      if (candidate.isVariable == false)
        return candidate;
      if (candidate.canReadSubset == null || candidate.canWriteSuperset == null)
        return candidate;
      if (candidate.canReadSubset.isMoreSpecificThan(candidate.canWriteSuperset)) {
        if (candidate.canWriteSuperset.isMoreSpecificThan(candidate.canReadSubset))
          candidate.variable.resolution = candidate.canReadSubset;
        return candidate;
      }
      return null;
    };

    let candidate = baseType.resolvedType();

    if (candidate.isCollection) {
      candidate = candidate.primitiveType();
      let resolution = getResolution(candidate);
      if (resolution == null)
        return null;
      return resolution.collectionOf();
    }

    return getResolution(candidate);
  }

  static _tryMergeTypeVariable(base, onto) {
    let [primitiveBase, primitiveOnto] = Type.unwrapPair(base.resolvedType(), onto.resolvedType());

    if (primitiveBase.isVariable) {
      if (primitiveOnto.isVariable) {
        // base, onto both variables.
        let result = primitiveBase.variable.maybeMergeConstraints(primitiveOnto.variable);
        if (result == false)
          return null;
        primitiveOnto.variable.resolution = primitiveBase;
      } else {
        // base variable, onto not.
        primitiveBase.variable.resolution = primitiveOnto;
      }
    } else if (primitiveOnto.isVariable) {
      // onto variable, base not.
      primitiveOnto.variable.resolution = primitiveBase;
      return onto;
    } else {
      assert(false, 'tryMergeTypeVariable shouldn\'t be called on two types without any type variables');
    }

    return base;
  }

  static _tryMergeConstraints(handleType, {type, direction}) {
    let [primitiveHandleType, primitiveConnectionType] = Type.unwrapPair(handleType.resolvedType(), type.resolvedType());
    if (primitiveHandleType.isVariable) {
      if (primitiveConnectionType.isCollection) {
        if (primitiveHandleType.variable.resolution != null
            || primitiveHandleType.variable.canReadSubset != null
            || primitiveHandleType.variable.canWriteSuperset != null) {
          // Resolved and/or constrained variables can only represent Entities, not sets.
          return false;
        }
        // If this is an undifferentiated variable then we need to create structure to match against. That's
        // allowed because this variable could represent anything, and it needs to represent this structure
        // in order for type resolution to succeed.
        primitiveHandleType.variable.resolution = Type.newCollection(Type.newVariable(new TypeVariable('a')));
        let unwrap = Type.unwrapPair(primitiveHandleType.resolvedType(), primitiveConnectionType);
        primitiveHandleType = unwrap[0];
        primitiveConnectionType = unwrap[1];
      }

      if (direction == 'out' || direction == 'inout') {
        // the canReadSubset of the handle represents the maximal type that can be read from the
        // handle, so we need to intersect out any type that is more specific than the maximal type
        // that could be written.
        if (!primitiveHandleType.variable.maybeMergeCanReadSubset(primitiveConnectionType.canWriteSuperset))
          return false;
      }
      if (direction == 'in' || direction == 'inout') {
        // the canWriteSuperset of the handle represents the maximum lower-bound type that is read from the handle,
        // so we need to union it with the type that wants to be read here.
        if (!primitiveHandleType.variable.maybeMergeCanWriteSuperset(primitiveConnectionType.canReadSubset))
          return false;
      }
    } else {
      if (primitiveConnectionType.tag !== primitiveHandleType.tag) return false;

      if (direction == 'out' || direction == 'inout')
        if (!TypeChecker._writeConstraintsApply(primitiveHandleType, primitiveConnectionType))
          return false;
      if (direction == 'in' || direction == 'inout')
        if (!TypeChecker._readConstraintsApply(primitiveHandleType, primitiveConnectionType))
          return false;
    }

    return true;
  }

  static _writeConstraintsApply(handleType, connectionType) {
    // this connection wants to write to this handle. If the written type is
    // more specific than the canReadSubset then it isn't violating the maximal type
    // that can be read.
    let writtenType = connectionType.canWriteSuperset;
    if (writtenType == null || handleType.canReadSubset == null)
      return true;
    if (writtenType.isMoreSpecificThan(handleType.canReadSubset))
      return true;
    return false;
  }

  static _readConstraintsApply(handleType, connectionType) {
    // this connection wants to read from this handle. If the read type
    // is less specific than the canWriteSuperset, then it isn't violating
    // the maximum lower-bound read type.
    let readType = connectionType.canReadSubset;
    if (readType == null|| handleType.canWriteSuperset == null)
      return true;
    if (handleType.canWriteSuperset.isMoreSpecificThan(readType))
      return true;
    return false;
  }

  // TODO: what is this? Does it still belong here?
  static restrictType(type, instance) {
    assert(type.isInterface, `restrictType not implemented for ${type}`);

    let shape = type.interfaceShape.restrictType(instance);
    if (shape == false)
      return false;
    return Type.newInterface(shape);
  }

  // Compare two types to see if they could be potentially resolved (in the absence of other
  // information). This is used as a filter when selecting compatible handles or checking
  // validity of recipes. This function returning true never implies that full type resolution
  // will succeed, but if the function returns false for a pair of types that are associated
  // then type resolution is guaranteed to fail.
  //
  // left, right: {type, direction, connection}
  static compareTypes(left, right) {
    let resolvedLeft = left.type.resolvedType();
    let resolvedRight = right.type.resolvedType();
    let [leftType, rightType] = Type.unwrapPair(resolvedLeft, resolvedRight);

    // a variable is compatible with a set only if it is unconstrained.
    if (leftType.isVariable && rightType.isCollection)
      return !(leftType.variable.canReadSubset || leftType.variable.canWriteSuperset);
    if (rightType.isVariable && leftType.isCollection)
      return !(rightType.variable.canReadSubset || rightType.variable.canWriteSuperset);

    if (leftType.isVariable || rightType.isVariable) {
      // TODO: everything should use this, eventually. Need to implement the
      // right functionality in Shapes first, though.
      return Type.canMergeConstraints(leftType, rightType);
    }

    if (leftType.type != rightType.type) {
      return false;
    }

    // TODO: we need a generic way to evaluate type compatibility
    //       shapes + entities + etc
    if (leftType.isInterface && rightType.isInterface) {
      if (leftType.interfaceShape.equals(rightType.interfaceShape)) {
        return true;
      }
    }

    if (!leftType.isEntity || !rightType.isEntity) {
      return false;
    }

    let leftIsSub = leftType.entitySchema.isMoreSpecificThan(rightType.entitySchema);
    let leftIsSuper = rightType.entitySchema.isMoreSpecificThan(leftType.entitySchema);

    if (leftIsSuper && leftIsSub) {
       return true;
    }
    if (!leftIsSuper && !leftIsSub) {
      return false;
    }
    let [superclass, subclass] = leftIsSuper ? [left, right] : [right, left];

    // treat handle types as if they were 'inout' connections. Note that this
    // guarantees that the handle's type will be preserved, and that the fact
    // that the type comes from a handle rather than a connection will also
    // be preserved.
    let superDirection = superclass.direction || (superclass.connection ? superclass.connection.direction : 'inout');
    let subDirection = subclass.direction || (subclass.connection ? subclass.connection.direction : 'inout');
    if (superDirection == 'in') {
      return true;
    }
    if (subDirection == 'out') {
      return true;
    }
    return false;
  }
}
