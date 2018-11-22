// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Type, EntityType, VariableType, CollectionType, BigCollectionType, InterfaceType, SlotType} from '../type.js';
import {TypeVariable} from '../type-variable.js';

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
    const newBaseTypeVariable = new TypeVariable('', null, null);
    if (baseType) {
      newBaseTypeVariable.resolution = baseType;
    }
    const newBaseType = Type.newVariable(newBaseTypeVariable);
    baseType = newBaseType;

    const concreteTypes = [];

    // baseType might be a variable (and is definitely a variable if no baseType was available).
    // Some of the list might contain variables too.

    // First attempt to merge all the variables into the baseType
    //
    // If the baseType is a variable then this results in a single place to manipulate the constraints
    // of all the other connected variables at the same time.
    for (const item of list) {
      if (item.type.resolvedType().hasVariable) {
        baseType = TypeChecker._tryMergeTypeVariable(baseType, item.type);
        if (baseType == null) {
          return null;
        }
      } else {
        concreteTypes.push(item);
      }
    }

    for (const item of concreteTypes) {
      if (!TypeChecker._tryMergeConstraints(baseType, item)) {
        return null;
      }
    }

    const getResolution = candidate => {
      if (!(candidate instanceof VariableType)) {
        return candidate;
      }
      if (candidate.canReadSubset == null || candidate.canWriteSuperset == null) {
        return candidate;
      }
      if (candidate.canReadSubset.isMoreSpecificThan(candidate.canWriteSuperset)) {
        if (candidate.canWriteSuperset.isMoreSpecificThan(candidate.canReadSubset)) {
          candidate.variable.resolution = candidate.canReadSubset;
        }
        return candidate;
      }
      return null;
    };

    const candidate = baseType.resolvedType();

    if (candidate instanceof CollectionType) {
      const resolution = getResolution(candidate.collectionType);
      return (resolution !== null) ? resolution.collectionOf() : null;
    }
    if (candidate instanceof BigCollectionType) {
      const resolution = getResolution(candidate.bigCollectionType);
      return (resolution !== null) ? resolution.bigCollectionOf() : null;
    }

    return getResolution(candidate);
  }

  static _tryMergeTypeVariable(base, onto) {
    const [primitiveBase, primitiveOnto] = Type.unwrapPair(base.resolvedType(), onto.resolvedType());

    if (primitiveBase instanceof VariableType) {
      if (primitiveOnto instanceof VariableType) {
        // base, onto both variables.
        const result = primitiveBase.variable.maybeMergeConstraints(primitiveOnto.variable);
        if (result === false) {
          return null;
        }
        // Here onto grows, one level at a time,
        // as we assign new resolution to primitiveOnto, which is a leaf.
        primitiveOnto.variable.resolution = primitiveBase;
      } else {
        // base variable, onto not.
        primitiveBase.variable.resolution = primitiveOnto;
      }
      return base;
    } else if (primitiveOnto instanceof VariableType) {
      // onto variable, base not.
      primitiveOnto.variable.resolution = primitiveBase;
      return onto;
    } else if (primitiveBase instanceof InterfaceType && primitiveOnto instanceof InterfaceType) {
      const result = primitiveBase.interfaceShape.tryMergeTypeVariablesWith(primitiveOnto.interfaceShape);
      if (result == null) {
        return null;
      }
      return Type.newInterface(result);
    } else if ((primitiveBase.isTypeContainer() && primitiveBase.hasVariable)
               || (primitiveOnto.isTypeContainer() && primitiveOnto.hasVariable)) {
      // Cannot merge [~a] with a type that is not a variable and not a collection.
      return null;
    }
    throw new Error('tryMergeTypeVariable shouldn\'t be called on two types without any type variables');
  }

  static _tryMergeConstraints(handleType, {type, direction}) {
    let [primitiveHandleType, primitiveConnectionType] = Type.unwrapPair(handleType.resolvedType(), type.resolvedType());
    if (primitiveHandleType instanceof VariableType) {
      while (primitiveConnectionType.isTypeContainer()) {
        if (primitiveHandleType.variable.resolution != null
            || primitiveHandleType.variable.canReadSubset != null
            || primitiveHandleType.variable.canWriteSuperset != null) {
          // Resolved and/or constrained variables can only represent Entities, not sets.
          return false;
        }
        // If this is an undifferentiated variable then we need to create structure to match against. That's
        // allowed because this variable could represent anything, and it needs to represent this structure
        // in order for type resolution to succeed.
        const newVar = Type.newVariable(new TypeVariable('a', null, null));
        if (primitiveConnectionType instanceof CollectionType) {
          primitiveHandleType.variable.resolution = Type.newCollection(newVar);
        } else if (primitiveConnectionType instanceof BigCollectionType) {
          primitiveHandleType.variable.resolution = Type.newBigCollection(newVar);
        } else {
          primitiveHandleType.variable.resolution = Type.newReference(newVar);
        }

        const unwrap = Type.unwrapPair(primitiveHandleType.resolvedType(), primitiveConnectionType);
        [primitiveHandleType, primitiveConnectionType] = unwrap;
      }

      if (direction === 'out' || direction === 'inout' || direction === '`provide') {
        // the canReadSubset of the handle represents the maximal type that can be read from the
        // handle, so we need to intersect out any type that is more specific than the maximal type
        // that could be written.
        if (!primitiveHandleType.variable.maybeMergeCanReadSubset(primitiveConnectionType.canWriteSuperset)) {
          return false;
        }
      }
      if (direction === 'in' || direction === 'inout' || direction === '`consume') {
        // the canWriteSuperset of the handle represents the maximum lower-bound type that is read from the handle,
        // so we need to union it with the type that wants to be read here.
        if (!primitiveHandleType.variable.maybeMergeCanWriteSuperset(primitiveConnectionType.canReadSubset)) {
          return false;
        }
      }
    } else {
      if (primitiveConnectionType.tag !== primitiveHandleType.tag) {
        return false;
      }

      if (direction === 'out' || direction === 'inout') {
        if (!TypeChecker._writeConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
          return false;
        }
      }
      if (direction === 'in' || direction === 'inout') {
        if (!TypeChecker._readConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
          return false;
        }
      }
    }

    return true;
  }

  static _writeConstraintsApply(handleType, connectionType) {
    // this connection wants to write to this handle. If the written type is
    // more specific than the canReadSubset then it isn't violating the maximal type
    // that can be read.
    const writtenType = connectionType.canWriteSuperset;
    if (writtenType == null || handleType.canReadSubset == null) {
      return true;
    }
    if (writtenType.isMoreSpecificThan(handleType.canReadSubset)) {
      return true;
    }
    return false;
  }

  static _readConstraintsApply(handleType, connectionType) {
    // this connection wants to read from this handle. If the read type
    // is less specific than the canWriteSuperset, then it isn't violating
    // the maximum lower-bound read type.
    const readType = connectionType.canReadSubset;
    if (readType == null || handleType.canWriteSuperset == null) {
      return true;
    }
    if (handleType.canWriteSuperset.isMoreSpecificThan(readType)) {
      return true;
    }
    return false;
  }

  // Compare two types to see if they could be potentially resolved (in the absence of other
  // information). This is used as a filter when selecting compatible handles or checking
  // validity of recipes. This function returning true never implies that full type resolution
  // will succeed, but if the function returns false for a pair of types that are associated
  // then type resolution is guaranteed to fail.
  //
  // left, right: {type, direction, connection}
  static compareTypes(left, right) {
    const resolvedLeft = left.type.resolvedType();
    const resolvedRight = right.type.resolvedType();
    const [leftType, rightType] = Type.unwrapPair(resolvedLeft, resolvedRight);

    // a variable is compatible with a set only if it is unconstrained.
    if (leftType instanceof VariableType && rightType.isTypeContainer()) {
      return !(leftType.variable.canReadSubset || leftType.variable.canWriteSuperset);
    }
    if (rightType instanceof VariableType && leftType.isTypeContainer()) {
      return !(rightType.variable.canReadSubset || rightType.variable.canWriteSuperset);
    }

    if (leftType instanceof VariableType || rightType instanceof VariableType) {
      // TODO: everything should use this, eventually. Need to implement the
      // right functionality in Shapes first, though.
      return Type.canMergeConstraints(leftType, rightType);
    }

    if ((leftType === undefined) !== (rightType === undefined)) {
      return false;
    }
    if (leftType === rightType) {
      return true;
    }

    if (leftType.tag !== rightType.tag) {
      return false;
    }

    if (leftType instanceof SlotType) {
      return true;
    }

    // TODO: we need a generic way to evaluate type compatibility
    //       shapes + entities + etc
    if (leftType instanceof InterfaceType && rightType instanceof InterfaceType) {
      if (leftType.interfaceShape.equals(rightType.interfaceShape)) {
        return true;
      }
    }

    if (!(leftType instanceof EntityType) || !(rightType instanceof EntityType)) {
      return false;
    }

    const leftIsSub = leftType.entitySchema.isMoreSpecificThan(rightType.entitySchema);
    const leftIsSuper = rightType.entitySchema.isMoreSpecificThan(leftType.entitySchema);

    if (leftIsSuper && leftIsSub) {
       return true;
    }
    if (!leftIsSuper && !leftIsSub) {
      return false;
    }
    const [superclass, subclass] = leftIsSuper ? [left, right] : [right, left];

    // treat handle types as if they were 'inout' connections. Note that this
    // guarantees that the handle's type will be preserved, and that the fact
    // that the type comes from a handle rather than a connection will also
    // be preserved.
    const superDirection = superclass.direction || (superclass.connection ? superclass.connection.direction : 'inout');
    const subDirection = subclass.direction || (subclass.connection ? subclass.connection.direction : 'inout');
    if (superDirection === 'in') {
      return true;
    }
    if (subDirection === 'out') {
      return true;
    }
    return false;
  }
}
