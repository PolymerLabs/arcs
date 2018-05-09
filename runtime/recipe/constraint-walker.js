// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {WalkerBase} from './walker-base.js';

export class ConstraintWalker extends WalkerBase {
  onResult(result) {
    super.onResult(result);
    let recipe = result.result;
    let updateList = [];

    recipe._connectionConstraints.forEach(constraint => {
      if (this.onConstraint) {
        let result = this.onConstraint(recipe, constraint);
        if (result)
          updateList.push({continuation: result, context: constraint});
      }
    });

    this._runUpdateList(recipe, updateList);
  }
}
