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

  // list: [{type, direction, connection}]
  static processTypeList(baseType, list) {
    if (list.length == 0) {
      return {type: baseType, valid: true};
    }

    let constraints = TypeChecker.typeToConstraints(baseType);
    let variables = [];

    for (let i = 0; i < list.length; i++) {
      let success = TypeChecker.mergeConstraintsOrFailTypeComparison(constraints, list[i]);
      if (!success)
        return {valid: false};
    
      if (list[i].isVariable)
        variables.push(list[i]);
    }

    for (let i = 1; i < variables.length; i++) {
      TypeChecker.mergeVariables(variables[0], variables[i]);
    }

    if (variables.length > 0) {
      TypeChecker.applyConstraintsToVariable(constraints, variables[0]);

    return {type: TypeChecker.constraintsToType(constraints), valid: true};
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
