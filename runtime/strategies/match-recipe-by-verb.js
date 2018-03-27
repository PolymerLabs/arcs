// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class MatchRecipeByVerb extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(inputParams) {
    let arc = this._arc;
    return Recipe.over(this.getResults(inputParams), new class extends RecipeWalker {
      onParticle(recipe, particle) {
        if (particle.name) {
          // Particle already has explicit name.
          return;
        }

        if (particle.allConnections().length > 0)
          return;

        let recipes = arc.context.findRecipesByVerb(particle.primaryVerb);

        let slotConstraints = {}
        for (let consumeSlot of Object.values(particle.consumedSlotConnections))
          slotConstraints[consumeSlot.name] = Object.keys(consumeSlot.providedSlots);

        recipes = recipes.filter(recipe => MatchRecipeByVerb.satisfiesSlotConstraints(recipe, slotConstraints));

        return recipes.map(recipe => {
          return (outputRecipe, particle) => {
            recipe.mergeInto(outputRecipe);
            particle.remove();

            return 1;
          };
        });
      }
    }(RecipeWalker.Permuted), this);
  }

  static satisfiesSlotConstraints(recipe, slotConstraints) {
    for (let slotName in slotConstraints)
      if (!MatchRecipeByVerb.satisfiesSlotConnection(recipe, slotName, slotConstraints[slotName]))
        return false;
    return true;
  }

  static satisfiesSlotConnection(recipe, slotName, providesSlots) {
    let satisfyingList = recipe.particles.filter(particle => Object.keys(particle.consumedSlotConnections).includes(slotName));
    return satisfyingList.filter(particle => MatchRecipeByVerb.satisfiesSlotProvision(particle.consumedSlotConnections[slotName], providesSlots)).length > 0;
  }

  static satisfiesSlotProvision(slotConnection, providesSlots) {
    let recipeProvidesSlots = Object.keys(slotConnection.providedSlots);
    for (let providesSlot of providesSlots)
      if (!recipeProvidesSlots.includes(providesSlot))
        return false;
    return true;
  }
}
