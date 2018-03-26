// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import Type from '../type.js';
import TypeVariable from '../type-variable.js';
import assert from '../../platform/assert-web.js';

class TypeChecker {

  // resolve a list of handleConnection types against a handle
  // base type.
  static processTypeList(baseType, list) {
    if (baseType == undefined)
      baseType = Type.newVariable(new TypeVariable('a'));

    let concreteTypes = [];

    // baseType might be a variable (and is definitely a variable if no baseType was available).
    // Some of the list might contain variables too.
    
    // First attempt to merge all the variables into the baseType
    //
    // If the baseType is a variable then this results in a single place to manipulate the constraints
    // of all the other connected variables at the same time.
    for (let item of list) {
      if (item.type.resolvedType().hasVariable) {
        baseType = TypeChecker.tryMergeTypeVariable(baseType, item.type);
        if (baseType == null)
          return null;
      } else {
        concreteTypes.push(item);
      }
    }

    for (let item of concreteTypes) {
      let success = TypeChecker.tryMergeConstraints(baseType, item);
      if (!success)
        return null;
    }

    let getResolution = candidate => {
      if (candidate.isVariable == false)
        return candidate;
      if (candidate.canReadSubset == null || candidate.canWriteSuperset == null)
        return candidate;
      if (candidate.canReadSubset.contains(candidate.canWriteSuperset)) {
        if (candidate.canWriteSuperset.contains(candidate.canReadSubset))
          return candidate.canReadSubset;
        return candidate;
      }  
      return null;
    }

    let candidate = baseType.resolvedType();

    if (candidate.isSetView) {
      candidate = candidate.primitiveType();
      let resolution = getResolution(candidate);
      if (resolution == null)
        return null;
      return resolution.setViewOf();
    }

    return getResolution(candidate);
  }

  static tryMergeTypeVariable(base, onto) {
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
      assert(false, "tryMergeTypeVariable shouldn't be called on two types without any type variables");
    }
    
    return base;
  }

  static tryMergeConstraints(handleType, { type, direction }) {
    let [primitiveHandleType, primitiveConnectionType] = Type.unwrapPair(handleType.resolvedType(), type.resolvedType());
    if (primitiveHandleType.isVariable) {
      // if this is an undifferentiated variable then we need to create structure to match against. That's
      // allowed because this variable could represent anything, and it needs to represent this structure
      // in order for type resolution to succeed.
      if (primitiveConnectionType.isSetView) {
        assert(primitiveHandleType.variable.resolution == null && primitiveHandleType.variable.canReadSubset == null && primitiveHandleType.variable.canWriteSuperset == null);
        primitiveHandleType.variable.resolution = Type.newSetView(Type.newVariable(new TypeVariable('a')));
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
      if (direction == 'out' || direction == 'inout')
        if (!TypeChecker.writeConstraintsApply(primitiveHandleType, primitiveConnectionType))
          return false;
      if (direction == 'in' || direction == 'inout')
        if (!TypeChecker.readConstraintsApply(primitiveHandleType, primitiveConnectionType))
          return false;
    }

    return true;
  }

  static writeConstraintsApply(handleType, connectionType) {
    // this connection wants to write to this handle. If the written type is
    // more specific than the canReadSubset then it isn't violating the maximal type
    // that can be read.
    let writtenType = connectionType.canWriteSuperset;
    if (writtenType == null || handleType.canReadSubset == null)
      return true;
    if (writtenType.contains(handleType.canReadSubset))
      return true;
    return false;
  }

  static readConstraintsApply(handleType, connectionType) {
    // this connection wants to read from this handle. If the read type
    // is less specific than the canWriteSuperset, then it isn't violating
    // the maximum lower-bound read type.
    let readType = connectionType.canReadSubset;
    if (readType == null|| handleType.canWriteSuperset == null)
      return true;
    if (handleType.canWriteSuperset.contains(readType))
      return true;
    return false;
  }

  static restrictType(type, instance) {
    assert(type.isInterface, `restrictType not implemented for ${type}`);

    let shape = type.interfaceShape.restrictType(instance);
    if (shape == false)
      return false;
    return Type.newInterface(shape);
  }

  // left, right: {type, direction, connection}
  static compareTypes(left, right, resolve=true) {
    let resolvedLeft = left.type.resolvedType();
    let resolvedRight = right.type.resolvedType();
    let [leftType, rightType] = Type.unwrapPair(resolvedLeft, resolvedRight);

    if (leftType.isVariable || rightType.isVariable) {
      if (leftType.isVariable && rightType.isVariable) {
        if (leftType.variable === rightType.variable) {
          return {type: left, valid: true};
        }
        if (leftType.variable.constraint || rightType.variable.constraint) {
          let mergedConstraint = TypeVariable.maybeMergeConstraints(leftType.variable, rightType.variable);
          if (!mergedConstraint) {
            return {valid: false};
          }
          if (resolve) {
            leftType.constraint = mergedConstraint;
            rightType.variable.resolution = leftType;
          }
        }
        return {type: left, valid: true};
      } else if (leftType.isVariable) {
        if (!leftType.variable.isSatisfiedBy(rightType)) {
          return {valid: false};
        }
        if (resolve) {
          leftType.variable.resolution = rightType;
        }
        return {type: right, valid: true};
      } else if (rightType.isVariable) {
        if (!rightType.variable.isSatisfiedBy(leftType)) {
          return {valid: false};
        }
        if (resolve) {
          rightType.variable.resolution = leftType;
        }
        return {type: left, valid: true};
      }
    }

    if (leftType.type != rightType.type) {
      return {valid: false};
    }

    // TODO: we need a generic way to evaluate type compatibility
    //       shapes + entities + etc
    if (leftType.isInterface && rightType.isInterface) {
      if (leftType.interfaceShape.equals(rightType.interfaceShape)) {
        return {type: left, valid: true};
      }
    }

    if (!leftType.isEntity || !rightType.isEntity) {
      return {valid: false};
    }

    let isSub = leftType.entitySchema.contains(rightType.entitySchema);
    let isSuper = rightType.entitySchema.contains(leftType.entitySchema);

    if (isSuper && isSub) {
       return {type: left, valid: true};
    }
    if (!isSuper && !isSub) {
      return {valid: false};
    }
    let [superclass, subclass] = isSuper ? [left, right] : [right, left];

    // TODO: this arbitrarily chooses type restriction when
    // super direction is 'in' and sub direction is 'out'. Eventually
    // both possibilities should be encoded so we can maximise resolution
    // opportunities

    // treat view types as if they were 'inout' connections. Note that this
    // guarantees that the view's type will be preserved, and that the fact
    // that the type comes from a view rather than a connection will also
    // be preserved.
    let superDirection = superclass.direction || (superclass.connection ? superclass.connection.direction : 'inout');
    let subDirection = subclass.direction || (subclass.connection ? subclass.connection.direction : 'inout');
    if (superDirection == 'in') {
      return {type: subclass, valid: true};
    }
    if (subDirection == 'out') {
      return {type: superclass, valid: true};
    }
    return {valid: false};
  }
}

export default TypeChecker;
