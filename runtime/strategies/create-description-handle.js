// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from '../../platform/assert-web.js';
import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class CreateDescriptionHandle extends Strategy {
  async generate(strategizer) {
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onHandleConnection(recipe, handleConnection) {
        if (handleConnection.handle)
          return;
        if (handleConnection.name != 'descriptions')
          return;

        return (recipe, handleConnection) => {
          let handle = recipe.newHandle();
          handle.fate = 'create';
          handleConnection.connectToHandle(handle);
          return 1;
        };
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}
