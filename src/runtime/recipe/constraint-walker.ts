// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {WalkerBase} from './walker-base.js';
import {Recipe} from './recipe';
import {ConnectionConstraint} from './connection-constraint.js';

export class ConstraintWalker extends WalkerBase {
  // Optional handler
  onConstraint?(recipe: Recipe, constraint: ConnectionConstraint);
  
  onResult(result) {
    super.onResult(result);
    const recipe: Recipe = result.result as Recipe;
    const updateList = [];

    recipe.connectionConstraints.forEach(constraint => {
      if (this.onConstraint) {
        const result = this.onConstraint(recipe, constraint);
        if (result) {
          updateList.push({continuation: result, context: constraint});
        }
      }
    });

    this._runUpdateList(recipe, updateList);
  }
}
