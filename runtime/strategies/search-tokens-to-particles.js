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

    this._particleByToken = {};
    this._particleByPhrase = {};
    this._recipeByToken = {};
    this._recipeByPhrase = {};
    for (let particle of arc.context.particles) {
      this._addThing(particle.name, particle, this._particleByToken, this._particleByPhrase);
      this._addThing(particle.primaryVerb, particle, this._particleByToken, this._particleByPhrase);
    }
    for (let recipe of arc.context.recipes) {
      this._addThing(recipe.name, recipe, this._recipeByToken, this._recipeByPhrase);
      recipe.verbs.forEach(verb => this._addThing(verb, recipe, this._recipeByToken, this._recipeByPhrase));
    }

    let findParticles = token => this._particleByToken[token] || [];
    let findRecipes = token => this._recipeByToken[token] || [];
    let particleByPhrase = this._particleByPhrase;
    let recipeByPhrase = this._recipeByPhrase;

    class SearchWalker extends Walker {
      onRecipe(recipe) {
        if (!recipe.search || !recipe.search.unresolvedTokens.length) {
          return;
        }

        let byToken = {};
        let resolvedTokens = new Set();

        Object.keys(particleByPhrase).forEach(phrase => {
          let tokens = phrase.split(' ');
          if (tokens.every(token => recipe.search.unresolvedTokens.find(unresolved => unresolved == token)) &&
              recipe.search.phrase.includes(phrase)) {
            for (let spec of particleByPhrase[phrase]) {
              byToken[phrase] = byToken[phrase] || [];
              byToken[phrase].push({spec});
              tokens.forEach(token => resolvedTokens.add(token));
            }
          }
        });

        Object.keys(recipeByPhrase).forEach(phrase => {
          let tokens = phrase.split(' ');
          if (tokens.every(token => recipe.search.unresolvedTokens.find(unresolved => unresolved == token)) &&
              recipe.search.phrase.includes(phrase)) {
            for (let innerRecipe of recipeByPhrase[phrase]) {
              byToken[phrase] = byToken[phrase] || [];
              byToken[phrase].push({innerRecipe});
              tokens.forEach(token => resolvedTokens.add(token));
            }
          }
        });

        for (let token of recipe.search.unresolvedTokens) {
          if (resolvedTokens.has(token)) {
            continue;
          }
          for (let spec of findParticles(token)) {
            // TODO: Skip particles that are already in the active recipe?
            byToken[token] = byToken[token] || [];
            byToken[token].push({spec});
            resolvedTokens.add(token);
          }
          for (let innerRecipe of findRecipes(token)) {
            // TODO: Skip recipes with particles that are already in the active recipe?
            byToken[token] = byToken[token] || [];
            byToken[token].push({innerRecipe});
            resolvedTokens.add(token);
          }
        }

        if (resolvedTokens.size == 0) {
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

  _addThing(token, thing, thingByToken, thingByPhrase) {
    if (!token) {
      return;
    }
    this._addThingByToken(token.toLowerCase(), thing, thingByToken);

    if (thingByPhrase) {
      // split DoSomething into "do something" and add the phrase
      let phrase = token.replace(/([^A-Z])([A-Z])/g, '$1 $2').replace(/([A-Z][^A-Z])/g, ' $1').replace(/[\s]+/g, ' ').trim();
      if (phrase != token) {
        this._addThingByToken(phrase.toLowerCase(), thing, thingByPhrase);
      }
    }
  }
  _addThingByToken(key, thing, thingByKey) {
    assert(key == key.toLowerCase());
    thingByKey[key] = thingByKey[key] || [];
    if (!thingByKey[key].find(t => t == thing)) {
      thingByKey[key].push(thing);
    }
  }

  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), this.walker, this);
  }
}
