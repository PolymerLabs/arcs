// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var Type = require('../type.js');
var assert = require('assert');

class TypeChecker {

  // list: [{type, direction, connection}]
  static processTypeList(list) {
    if (list.length == 0) {
      return {type: {type: undefined}, valid: true};
    }
    var baseType = list[0];
    var variableResolutions = [];
    for (var i = 1; i < list.length; i++) {
      let result = TypeChecker.compareTypes(baseType, list[i], variableResolutions);
      baseType = result.type;
      if (!result.valid) {
        return {valid: false};
      }
    }
    TypeChecker.applyVariableResolutions(variableResolutions);
    return {type: baseType, valid: true};
  }

  static _applyResolutionsToType(type, resolutions) {
    if (resolutions.length > 0)
      console.log('apply resolutions to type', type, resolutions);
    return type;
  }

  static _coerceTypes(left, right) {
    var leftType = left.type;
    var rightType = right.type;
    var resolutions = [];

    while (leftType.isView && rightType.isView) {
      leftType = leftType.primitiveType();
      rightType = rightType.primitiveType();
    }
    // TODO: direction?
    if (leftType.isVariable) {
      resolutions.push({variable: leftType, becomes: rightType, context: left.connection});
      var type = right;
    } else if (rightType.isVariable) {
      resolutions.push({variable: rightType, becomes: leftType, context: right.connection});
      var type = left;
    } else {
      return null;
    }
    return {type, resolutions};
  }

  // left, right: {type, direction, connection}
  static compareTypes(left, right, resolutions) {
    left = TypeChecker._applyResolutionsToType(left, resolutions);
    right = TypeChecker._applyResolutionsToType(right, resolutions);

    if (left.type.equals(right.type))
      return {type: left, valid: true};

    // TODO: subset/superset relations between types.

    let result  = TypeChecker._coerceTypes(left, right);
    if (result == null)
      return {valid: false};
    // TODO: direction?
    result.resolutions.forEach(resolution => resolutions.push(resolution));
    return {type: result.type, valid: true}
  }

  static substitute(type, variable, value) {
    if (type.equals(variable))
      return value;
    if (type.isView)
      return TypeChecker.substitute(type.primitiveType(), variable, value).viewOf();
    return type;
  }

  static applyVariableResolutions(resolutions) {
    resolutions.forEach(resolution => {
      var particle = resolution.context.particle;
      particle.allConnections().forEach(connection => {
        // TODO: is this actually always true?
        assert(connection.type == connection.rawType);
        connection._type = TypeChecker.substitute(connection.rawType, resolution.variable, resolution.becomes);
      });
    });
  }
}

module.exports = TypeChecker;
