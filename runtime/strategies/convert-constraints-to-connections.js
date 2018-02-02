// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';
import RecipeUtil from '../recipe/recipe-util.js';

export default class ConvertConstraintsToConnections extends Strategy {
  constructor(arc) {
    super();
    this.affordance = arc.pec.slotComposer ? arc.pec.slotComposer.affordance : null;
  }
  async generate(strategizer) {
    let affordance = this.affordance;
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onRecipe(recipe) {
        let particles = new Set();
        let views = new Set();
        let map = {};
        let particlesByName = {};
        let viewCount = 0;
        for (let constraint of recipe.connectionConstraints) {
          if (affordance && (!constraint.fromParticle.matchAffordance(affordance) || !constraint.toParticle.matchAffordance(affordance))) {
            return;
          }
          particles.add(constraint.fromParticle.name);
          if (map[constraint.fromParticle.name] == undefined) {
            map[constraint.fromParticle.name] = {};
            particlesByName[constraint.fromParticle.name] = constraint.fromParticle;
          }
          particles.add(constraint.toParticle.name);
          if (map[constraint.toParticle.name] == undefined) {
            map[constraint.toParticle.name] = {};
            particlesByName[constraint.toParticle.name] = constraint.toParticle;
          }
          let view = map[constraint.fromParticle.name][constraint.fromConnection];
          if (view == undefined) {
            view = 'v' + viewCount++;
            map[constraint.fromParticle.name][constraint.fromConnection] = view;
            views.add(view);
          }
          map[constraint.toParticle.name][constraint.toConnection] = view;
        }
        let shape = RecipeUtil.makeShape([...particles.values()], [...views.values()], map);
        let results = RecipeUtil.find(recipe, shape);

        return results.map(match => {
          return (recipe) => {
            let score = recipe.connectionConstraints.length + match.score;
            let recipeMap = recipe.updateToClone(match.match);
            for (let particle in map) {
              for (let connection in map[particle]) {
                let view = map[particle][connection];
                let recipeParticle = recipeMap[particle];
                if (recipeParticle == null) {
                  recipeParticle = recipe.newParticle(particle);
                  recipeParticle.spec = particlesByName[particle];
                  recipeMap[particle] = recipeParticle;
                }
                let recipeViewConnection = recipeParticle.connections[connection];
                if (recipeViewConnection == undefined)
                  recipeViewConnection = recipeParticle.addConnectionName(connection);
                let recipeView = recipeMap[view];
                if (recipeView == null) {
                  recipeView = recipe.newView();
                  recipeView.fate = 'create';
                  recipeMap[view] = recipeView;
                }
                if (recipeViewConnection.view == null)
                  recipeViewConnection.connectToView(recipeView);
              }
            }
            recipe.clearConnectionConstraints();
            return score;
          };
        });
      }
    }(RecipeWalker.Independent), this);

    return {results, generate: null};
  }
}
