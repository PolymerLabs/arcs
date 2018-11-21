// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../ts-build/recipe/recipe.js';
import {Walker} from '../ts-build/recipe/walker.js';

export class SearchTokensToParticles extends Strategy {
  constructor(arc) {
    super();

    const thingByToken = {};
    const thingByPhrase = {};
    for (const [thing, packaged] of [...arc.context.particles.map(p => [p, {spec: p}]),
                                   ...arc.context.allRecipes.map(r => [r, {innerRecipe: r}])]) {
      this._addThing(thing.name, packaged, thingByToken, thingByPhrase);
      thing.verbs.forEach(verb => this._addThing(verb, packaged, thingByToken, thingByPhrase));
    }

    class SearchWalker extends Walker {
      constructor(tactic, arc) {
        super(tactic);
        this.index = arc.recipeIndex;
      }

      onRecipe(recipe) {
        if (!recipe.search || !recipe.search.unresolvedTokens.length) {
          return;
        }

        const byToken = {};
        const resolvedTokens = new Set();
        const _addThingsByToken = (token, things) => {
          things.forEach(thing => {
            byToken[token] = byToken[token] || [];
            byToken[token].push(thing);
            token.split(' ').forEach(t => resolvedTokens.add(t));
          });
        };

        for (const [phrase, things] of Object.entries(thingByPhrase)) {
          const tokens = phrase.split(' ');
          if (tokens.every(token => recipe.search.unresolvedTokens.find(unresolved => unresolved === token)) &&
              recipe.search.phrase.includes(phrase)) {
            _addThingsByToken(phrase, things);
          }
        }

        for (const token of recipe.search.unresolvedTokens) {
          if (resolvedTokens.has(token)) {
            continue;
          }
          const things = thingByToken[token];
          things && _addThingsByToken(token, things);
        }

        if (resolvedTokens.size === 0) {
          return;
        }

        const flatten = (arr) => [].concat(...arr);
        const product = (...sets) =>
          sets.reduce((acc, set) =>
            flatten(acc.map(x => set.map(y => [...x, y]))),
            [[]]);
        const possibleCombinations = product(...Object.values(byToken).map(v => flatten(v)));

        return possibleCombinations.map(combination => {
          return recipe => {
            resolvedTokens.forEach(token => recipe.search.resolveToken(token));
            combination.forEach(({spec, innerRecipe}) => {
              if (spec) {
                const particle = recipe.newParticle(spec.name);
                particle.spec = spec;
              } else {
                const otherToHandle = this.index.findCoalescableHandles(recipe, innerRecipe);
                assert(innerRecipe);
                const {cloneMap} = innerRecipe.mergeInto(recipe);
                otherToHandle.forEach((otherHandle, handle) => cloneMap.get(otherHandle).mergeInto(handle));
              }
            });
            return resolvedTokens.size;
          };
        });
      }
    }
    this._walker = new SearchWalker(Walker.Permuted, arc);
  }

  get walker() {
    return this._walker;
  }

  getResults(inputParams) {
    assert(inputParams);
    const generated = super.getResults(inputParams).filter(result => !result.result.isResolved());
    const terminal = inputParams.terminal;
    return [...generated, ...terminal];
  }

  _addThing(token, thing, thingByToken, thingByPhrase) {
    if (!token) {
      return;
    }
    this._addThingByToken(token.toLowerCase(), thing, thingByToken);

    // split DoSomething into "do something" and add the phrase
    const phrase = token.replace(/([^A-Z])([A-Z])/g, '$1 $2').replace(/([A-Z][^A-Z])/g, ' $1').replace(/[\s]+/g, ' ').trim();
    if (phrase !== token) {
      this._addThingByToken(phrase.toLowerCase(), thing, thingByPhrase);
    }
  }
  _addThingByToken(key, thing, thingByKey) {
    assert(key === key.toLowerCase());
    thingByKey[key] = thingByKey[key] || [];
    if (!thingByKey[key].find(t => t === thing)) {
      thingByKey[key].push(thing);
    }
  }

  async generate(inputParams) {
    await this.walker.index.ready;
    return Recipe.over(this.getResults(inputParams), this.walker, this);
  }
}
