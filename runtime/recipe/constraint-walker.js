// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import Recipe from './recipe.js';
import WalkerBase from './walker-base.js';

class ConstraintWalker extends WalkerBase {
  onResult(result) {
    super.onResult(result);
    var recipe = result.result;
    var updateList = [];

    recipe._connectionConstraints.forEach(constraint => {
      if (this.onConstraint) {
        var result = this.onConstraint(recipe, constraint);
        if (result)
          updateList.push({continuation: result, context: constraint});
      }
    });

    this._runUpdateList(recipe, updateList);
  }
}

export default ConstraintWalker;
