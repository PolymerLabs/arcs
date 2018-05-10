// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';

export class SearchTokensToParticles extends Strategy {
  constructor(arc) {
    super();
    // TODO: Recipes. Handles?
    this._particleByToken = {};
    this._recipeByToken = {};
    for (let particle of arc.context.particles) {
      let name = particle.name.toLowerCase();
      this._addParticle(name, particle);

      let verb = particle.primaryVerb;
      if (verb != name) {
        this._addParticle(verb, particle);
      }
    }
    for (let recipe of arc.context.recipes) {
      if (recipe.name) {
        this._addRecipe(recipe.name.toLowerCase(), recipe);
      }
      recipe.verbs.forEach(verb => {
        this._addRecipe(verb, recipe);
      });
    }

    let findParticles = token => this._particleByToken[token] || [];
    let findRecipes = token => this._recipeByToken[token] || [];
    class SearchWalker extends Walker {
      onRecipe(recipe) {
        if (!recipe.search || !recipe.search.unresolvedTokens.length) {
          return;
        }

        let byToken = {};
        for (let token of recipe.search.unresolvedTokens) {
          for (let spec of findParticles(token)) {
            // TODO: Skip particles that are already in the active recipe?
            byToken[token] = byToken[token] || [];
            byToken[token].push({spec});
          }
          for (let innerRecipe of findRecipes(token)) {
            // TODO: Skip recipes with particles that are already in the active recipe?
            byToken[token] = byToken[token] || [];
            byToken[token].push({innerRecipe});
          }
        }
        let resolvedTokens = Object.keys(byToken);
        if (resolvedTokens.length == 0) {
          return;
        }

        const flatten = (arr) => [].concat(...arr);
        const product = (...sets) =>
          sets.reduce((acc, set) =>
            flatten(acc.map(x => set.map(y => [...x, y]))),
            [[]]);
        let possibleCombinations = product(...Object.values(byToken).map(v => flatten(v)));

        return possibleCombinations.map(combination => {
          return recipe => {
            resolvedTokens.forEach(token => recipe.search.resolveToken(token));
            combination.forEach(({spec, innerRecipe}) => {
              if (spec) {
                let particle = recipe.newParticle(spec.name);
                particle.spec = spec;
              } else {
                assert(innerRecipe);
                innerRecipe.mergeInto(recipe);
              }
            });
            return resolvedTokens.size;
          };
        });
      }
    }
    this._walker = new SearchWalker(Walker.Permuted);
  }

  get walker() {
    return this._walker;
  }

  getResults(inputParams) {
    assert(inputParams);
    let generated = super.getResults(inputParams).filter(result => !result.result.isResolved());
    let terminal = inputParams.terminal;
    return [...generated, ...terminal];
  }

  _addParticle(token, particle) {
    this._particleByToken[token] = this._particleByToken[token] || [];
    this._particleByToken[token].push(particle);
  }
  _addRecipe(token, recipe) {
    this._recipeByToken[token] = this._recipeByToken[token] || [];
    this._recipeByToken[token].push(recipe);
  }
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), this.walker, this);
  }
}
