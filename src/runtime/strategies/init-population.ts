// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy, Descendant} from '../../planning/strategizer.js';
import {Arc} from '../arc.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeIndex} from '../recipe-index.js';

type ScoredRecipe = {
  recipe: Recipe;
  score?: number
};

export class InitPopulation extends Strategy {
  _contextual: boolean;
  _recipeIndex: RecipeIndex;
  _loadedParticles: Set<string>;

  constructor(arc: Arc, {contextual = false, recipeIndex}) {
    super(arc, {contextual});
    this._contextual = contextual;
    this._recipeIndex = recipeIndex;
    this._loadedParticles = new Set(this.arc.loadedParticles().map(spec => spec.implFile));
  }

  async generate({generation}: {generation: number}): Promise<Descendant[]> {
    if (generation !== 0) {
      return [];
    }

    await this._recipeIndex.ready;
    const results = this._contextual
        ? this._contextualResults()
        : this._allResults();

    return results.map(({recipe, score = 1}) => ({
      result: recipe,
      score,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: Object.isFrozen(recipe)
    }));
  }

  private _contextualResults(): ScoredRecipe[] {
    const results: ScoredRecipe[] = [];
    for (const slot of this.arc.activeRecipe.slots.filter(s => s.sourceConnection)) {
      results.push(...this._recipeIndex.findConsumeSlotConnectionMatch(slot).map(
          ({slotConn}) => ({recipe: slotConn.recipe})));
    }
    let innerArcHandles = [];
    for (const recipe of this.arc.recipes) {
      for (const innerArc of [...recipe.innerArcs.values()]) {
        innerArcHandles = innerArcHandles.concat(innerArc.activeRecipe.handles);
      }
    }
    for (const handle of this.arc.activeRecipe.handles.concat(innerArcHandles)) {
      results.push(...this._recipeIndex.findHandleMatch(handle, ['use', '?']).map(
          otherHandle => ({recipe: otherHandle.recipe})));
    }
    return results;
  }

  private _allResults(): ScoredRecipe[] {
    return this._recipeIndex.recipes.map(recipe => ({
      recipe,
      score: 1 - recipe.getParticlesByImplFile(this._loadedParticles).length
    }));
  }
}
