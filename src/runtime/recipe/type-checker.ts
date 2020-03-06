/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {BigCollectionType, CollectionType, EntityType, InterfaceType, ReferenceType, SlotType, Type, TypeVariable, TupleType} from '../type.js';
import {Direction} from '../manifest-ast-nodes.js';

export interface TypeListInfo {
  type: Type;
  direction?: Direction;
  relaxed?: boolean;
  connection?: {direction: Direction};
}

type TypeCheckOptions = {typeErrors?: string[]};

export class TypeChecker {

  // NOTE: you almost definitely don't want to call this function, if you think
  // you do, talk to shans@.
  private static getResolution(candidate: Type, options: TypeCheckOptions): Type | null {
    if (candidate.isCollectionType()) {
      const resolution = TypeChecker.getResolution(candidate.collectionType, options);
      return (resolution !== null) ? resolution.collectionOf() : null;
    }
    if (candidate.isBigCollectionType()) {
      const resolution = TypeChecker.getResolution(candidate.bigCollectionType, options);
      return (resolution !== null) ? resolution.bigCollectionOf() : null;
    }
    if (candidate.isReferenceType()) {
      const resolution = TypeChecker.getResolution(candidate.referredType, options);
      return (resolution !== null) ? resolution.referenceTo() : null;
    }
    if (candidate.isTupleType()) {
      const resolutions = candidate.innerTypes.map(t => TypeChecker.getResolution(t, options));
      return resolutions.every(r => r !== null) ? new TupleType(resolutions) : null;
    }

    if (!(candidate instanceof TypeVariable)) {
      return candidate;
    }
    if (candidate.canReadSubset == null || candidate.canWriteSuperset == null) {
      // This variable cannot be concretized without losing information.
      return candidate;
    }
    if (candidate.canReadSubset.isAtleastAsSpecificAs(candidate.canWriteSuperset)) {
      // The resolution is still possible, but we may not have more information then the current candidate.
      if (candidate.canWriteSuperset.isAtleastAsSpecificAs(candidate.canReadSubset)) {
        // The type bounds have 'met', they are equivalent and are the resolution.
        candidate.variable.resolution = candidate.canReadSubset;
      }
      return candidate;
    }
    // The candidate's requirements are no longer valid, it is uninhabitable / unsatisfiable.
    if (options && options.typeErrors) {
      const msg = `could not guarantee variable ${candidate} meets read requirements ${candidate.canWriteSuperset} with write guarantees ${candidate.canReadSubset}`;
      options.typeErrors.push(msg);
    }
    return null;
  }

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
  static processTypeList(baseType: Type, list: TypeListInfo[], options: TypeCheckOptions = {}) {
    const newBaseType = TypeVariable.make('');
    if (baseType) {
      newBaseType.variable.resolution = baseType;
    }
    baseType = newBaseType;

    const concreteTypes: TypeListInfo[] = [];

    // baseType might be a variable (and is definitely a variable if no baseType was available).
    // Some of the list might contain variables too.

    // First attempt to merge all the variables into the baseType
    //
    // If the baseType is a variable then this results in a single place to manipulate the constraints
    // of all the other connected variables at the same time.
    for (const item of list) {
      if (item.type.resolvedType().hasVariable) {
        baseType = TypeChecker._tryMergeTypeVariable(baseType, item.type, options);
        if (baseType == null) {
          return null;
        }
      } else {
        concreteTypes.push(item);
      }
    }

    for (const item of concreteTypes) {
      if (item.relaxed) {
        // Skip relaxed handles, as they do not constrain the type.
        continue;
      }
      if (!TypeChecker._tryMergeConstraints(baseType, item, options)) {
        return null;
      }
    }

    return TypeChecker.getResolution(baseType.resolvedType(), options);
  }

  static _tryMergeTypeVariable(base: Type, onto: Type, options: {typeErrors?: string[]} = {}): Type {
    const [primitiveBase, primitiveOnto] = Type.unwrapPair(base.resolvedType(), onto.resolvedType());

    if (primitiveBase instanceof TypeVariable) {
      if (primitiveOnto instanceof TypeVariable) {
        // base, onto both variables.
        const result = primitiveBase.variable.maybeMergeConstraints(primitiveOnto.variable);
        if (result === false) {
          return null;
        }
        primitiveOnto.variable.resolution = primitiveBase;
      } else {
        // base variable, onto not.
        if (!primitiveBase.variable.isValidResolutionCandidate(primitiveOnto).result) {
          return null;
        }
        primitiveBase.variable.resolution = primitiveOnto;
      }
      return base;
    } else if (primitiveOnto instanceof TypeVariable) {
      // onto variable, base not.
      if (!primitiveOnto.variable.isValidResolutionCandidate(primitiveBase).result) {
        return null;
      }
      primitiveOnto.variable.resolution = primitiveBase;
      return onto;
    } else if (primitiveBase instanceof InterfaceType && primitiveOnto instanceof InterfaceType) {
      const result = primitiveBase.interfaceInfo.tryMergeTypeVariablesWith(primitiveOnto.interfaceInfo);
      if (result == null) {
        return null;
      }
      return new InterfaceType(result);
    } else if ((primitiveBase.isTypeContainer() && primitiveBase.hasVariable)
               || (primitiveOnto.isTypeContainer() && primitiveOnto.hasVariable)) {
      // Cannot merge [~a] with a type that is not a variable and not a collection.
      return null;
    }
    throw new Error('tryMergeTypeVariable shouldn\'t be called on two types without any type variables');
  }

  static _tryMergeConstraints(handleType: Type, {type, relaxed, direction}: TypeListInfo, options: {typeErrors?: string[]} = {}): boolean {
    const [handleInnerTypes, connectionInnerTypes] = Type.tryUnwrapMulti(handleType.resolvedType(), type.resolvedType());
    // If both handle and connection are matching type containers with multiple arguments,
    // merge constraints pairwaise for all inner types.
    if (handleInnerTypes != null) {
      if (handleInnerTypes.length !== connectionInnerTypes.length) return false;
      for (let i = 0; i < handleInnerTypes.length; i++) {
        if (!this._tryMergeConstraints(handleInnerTypes[i], {type: connectionInnerTypes[i], relaxed, direction}, options)) {
          return false;
        }
      }
      return true;
    }

    const [primitiveHandleType, primitiveConnectionType] = Type.unwrapPair(handleType.resolvedType(), type.resolvedType());

    if (primitiveHandleType instanceof TypeVariable) {
      if (primitiveConnectionType.isTypeContainer()) {
        if (primitiveHandleType.variable.resolution != null
            || primitiveHandleType.variable.canReadSubset != null
            || primitiveHandleType.variable.canWriteSuperset != null) {
          // Resolved and/or constrained variables can only represent Entities, not sets.
          return false;
        }
        // If this is an undifferentiated variable then we need to create structure to match against. That's
        // allowed because this variable could represent anything, and it needs to represent this structure
        // in order for type resolution to succeed.
        if (primitiveConnectionType instanceof CollectionType) {
          primitiveHandleType.variable.resolution = new CollectionType(TypeVariable.make('a'));
        } else if (primitiveConnectionType instanceof BigCollectionType) {
          primitiveHandleType.variable.resolution = new BigCollectionType(TypeVariable.make('a'));
        } else if (primitiveConnectionType instanceof ReferenceType) {
          primitiveHandleType.variable.resolution = new ReferenceType(TypeVariable.make('a'));
        } else if (primitiveConnectionType instanceof TupleType) {
          primitiveHandleType.variable.resolution = new TupleType(
            primitiveConnectionType.innerTypes.map((_, idx) => TypeVariable.make(`a${idx}`)));
        } else {
          throw new TypeError(`Unrecognized type container: ${primitiveConnectionType.tag}`);
        }

        // Call recursively to unwrap and merge constraints of potentially multiple type variables (e.g. for tuples).
        return this._tryMergeConstraints(primitiveHandleType.resolvedType(), {type: primitiveConnectionType, relaxed, direction}, options);
      }

      if (direction === 'writes' || direction === 'reads writes' || direction === '`provides') {
        // the canReadSubset of the handle represents the maximal type that can be read from the
        // handle, so we need to intersect out any type that is more specific than the maximal type
        // that could be written.
        if (!primitiveHandleType.variable.maybeMergeCanReadSubset(primitiveConnectionType.canWriteSuperset)) {
          return false;
        }
      }
      if (!relaxed) {
        // Requirements for relaxed handle connections are not currently enforced.
        if (direction === 'reads' || direction === 'reads writes' || direction === '`consumes') {
          // the canWriteSuperset of the handle represents the maximum lower-bound type that is read from the handle,
          // so we need to union it with the type that wants to be read here.
          if (!primitiveHandleType.variable.maybeMergeCanWriteSuperset(primitiveConnectionType.canReadSubset)) {
            return false;
          }
        }
      }
    } else {
      if (primitiveConnectionType.tag !== primitiveHandleType.tag) {
        return false;
      }

      if (direction === 'writes' || direction === 'reads writes') {
        if (!TypeChecker._writeConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
          return false;
        }
      }
      if (!relaxed) {
        // Requirements for relaxed handle connections are not currently enforced.
        if (direction === 'reads' || direction === 'reads writes') {
          if (!TypeChecker._readConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  static _writeConstraintsApply(handleType: Type, connectionType: Type) {
    // this connection wants to write to this handle. If the written type is
    // more specific than the canReadSubset then it isn't violating the maximal type
    // that can be read.
    const writtenType = connectionType.canWriteSuperset;
    if (writtenType == null || handleType.canReadSubset == null) {
      return true;
    }
    if (writtenType.isAtleastAsSpecificAs(handleType.canReadSubset)) {
      return true;
    }
    return false;
  }

  static _readConstraintsApply(handleType: Type, connectionType: Type) {
    // this connection wants to read from this handle. If the read type
    // is less specific than the canWriteSuperset, then it isn't violating
    // the maximum lower-bound read type.
    const readType = connectionType.canReadSubset;
    if (readType == null || handleType.canWriteSuperset == null) {
      return true;
    }
    if (handleType.canWriteSuperset.isAtleastAsSpecificAs(readType)) {
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
  static compareTypes(left: TypeListInfo, right: TypeListInfo): boolean {
    const resolvedLeft = left.type.resolvedType();
    const resolvedRight = right.type.resolvedType();
    const [leftType, rightType] = Type.unwrapPair(resolvedLeft, resolvedRight);

    // a variable is compatible with a set only if it is unconstrained.
    if (leftType instanceof TypeVariable && rightType.isTypeContainer()) {
      return !(leftType.variable.canReadSubset || leftType.variable.canWriteSuperset);
    }
    if (rightType instanceof TypeVariable && leftType.isTypeContainer()) {
      return !(rightType.variable.canReadSubset || rightType.variable.canWriteSuperset);
    }

    if (leftType instanceof TypeVariable || rightType instanceof TypeVariable) {
      // TODO: everything should use this, eventually. Need to implement the
      // right functionality in Interfaces first, though.
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
    //       interfaces + entities + etc
    if (leftType instanceof InterfaceType && rightType instanceof InterfaceType) {
      if (leftType.interfaceInfo.equals(rightType.interfaceInfo)) {
        return true;
      }
    }

    if (!(leftType instanceof EntityType) || !(rightType instanceof EntityType)) {
      return false;
    }

    const leftIsSub = leftType.entitySchema.isAtleastAsSpecificAs(rightType.entitySchema);
    const leftIsSuper = rightType.entitySchema.isAtleastAsSpecificAs(leftType.entitySchema);

    if (leftIsSuper && leftIsSub) {
       return true;
    }
    if (!leftIsSuper && !leftIsSub) {
      return false;
    }
    const [superclass, subclass] = leftIsSuper ? [left, right] : [right, left];

    // treat handle types as if they were 'reads writes' connections. Note that this
    // guarantees that the handle's type will be preserved, and that the fact
    // that the type comes from a handle rather than a connection will also
    // be preserved.
    const superDirection = superclass.direction || (superclass.connection ? superclass.connection.direction : 'reads writes');
    const subDirection = subclass.direction || (subclass.connection ? subclass.connection.direction : 'reads writes');
    if (superDirection === 'reads') {
      return true;
    }
    if (subDirection === 'writes') {
      return true;
    }
    return false;
  }
}
