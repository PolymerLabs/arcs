// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {assert} from '../../platform/assert-web.js';

export class InitSearch extends Strategy {
  constructor(arc) {
    super();
    // TODO: Figure out where this should really come from.
    this._search = arc.search;
  }
  async generate({generation}) {
    if (this._search == null || generation != 0) {
      return [];
    }

    let recipe = new Recipe();
    recipe.setSearchPhrase(this._search);
    assert(recipe.normalize());
    assert(!recipe.isResolved());

    return [{
      result: recipe,
      score: 0,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
    }];
  }
}
