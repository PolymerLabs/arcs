// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

class TypeChecker {

  static processTypeList(list) {
    var baseType = list[0];
    var variableResolutions = [];
    for (var i = 1; i < list.length; i++) {
      var {baseType, valid} = TypeChecker.compareTypes(baseType, list[i], variableResolutions);
      if (!valid)
        return {valid};
    }
    TypeChecker.applyVariableResolutions(variableResolutions);
    return {type: baseType, valid};
  }

  static compareTypes(left, right, resolutions) {

  }

  static applyVariableResolutions(resolutions);
}

module.exports = TypeChecker;
