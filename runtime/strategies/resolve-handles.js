// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeUtil from '../recipe/recipe-util.js';
import assert from '../../platform/assert-web.js';

export default class ResolveHandles extends Strategy {
  async generate(strategizer) {
    let inputs = this.getResults(strategizer);
    inputs.forEach(input => {
      let recipe = input.result;
      let unresolvedHandles = recipe.handles.filter(handle => {
        if (handle.connections.length == 0)
          return false;
        if (handle.id)
          return false;
        if (!handle.type)
          return false;
        return true;
      });

      console.log(recipe.toString());
      console.log(unresolvedHandles);
    });

    return {results: [], generate: null};
  }
}