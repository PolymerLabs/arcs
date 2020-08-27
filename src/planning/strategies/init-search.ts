/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Recipe} from '../../runtime/recipe/lib-recipe.js';
import {Recipe as RecipeImpl} from '../../runtime/recipe/recipe.js';
import {Descendant} from '../../runtime/recipe/walker.js';
import {Strategy} from '../strategizer.js';

export class InitSearch extends Strategy {
  _search;

  constructor(arc, {search}) {
    super(arc, {search});
    this._search = search;
  }

  async generate({generation}): Promise<Descendant<Recipe>[]> {
    if (this._search == null || generation !== 0) {
      return [];
    }

    const recipe = new RecipeImpl();
    recipe.setSearchPhrase(this._search);
    assert(recipe.normalize());
    assert(!recipe.isResolved());

    return [{
      result: recipe,
      score: 0,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: true
    }];
  }
}
