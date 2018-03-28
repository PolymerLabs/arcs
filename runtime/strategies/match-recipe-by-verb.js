// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

// This strategy substitutes 'particle can verb' declarations with recipes, 
// according to the following conditions:
// 1) the recipe is named by the verb described in the particle
// 2) the recipe has the slot pattern (if any) owned by the particle
//
// The strategy also reconnects any slots that were connected to the 
// particle, so that the substituted recipe fully takes the particle's place. 
//
// Note that the recipe may have the slot pattern multiple times over, but
// this strategy currently only connects the first instance of the pattern up
// if there are multiple instances.
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
        for (let consumeSlot of Object.values(particle.consumedSlotConnections)) {
          slotConstraints[consumeSlot.name] = {};
          for (let providedSlot of Object.keys(consumeSlot.providedSlots)) {
            slotConstraints[consumeSlot.name][providedSlot] = consumeSlot.providedSlots[providedSlot];
          }
        }

        recipes = recipes.filter(recipe => MatchRecipeByVerb.satisfiesSlotConstraints(recipe, slotConstraints));

        return recipes.map(recipe => {
          return (outputRecipe, particle) => {
            let {handles, particles, slots} = recipe.mergeInto(outputRecipe);

            particle.remove();

            for (let consumeSlot in slotConstraints) {
              for (let provideSlot in slotConstraints[consumeSlot]) {
                let slot = slotConstraints[consumeSlot][provideSlot];
                let {mappedSlot} = outputRecipe.updateToClone({mappedSlot: slot});
                for (let particle of particles) {
                  if (particle.consumedSlotConnections[consumeSlot]) {
                    if (particle.consumedSlotConnections[consumeSlot].providedSlots[provideSlot]) {
                      let oldSlot = particle.consumedSlotConnections[consumeSlot].providedSlots[provideSlot];
                      oldSlot.remove();
                      particle.consumedSlotConnections[consumeSlot].providedSlots[provideSlot] = mappedSlot;
                      mappedSlot._sourceConnection = particle.consumedSlotConnections[consumeSlot];
                      break;
                    }
                  }                  
                }
              }
            }


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
    for (let providesSlot of Object.keys(providesSlots))
      if (!recipeProvidesSlots.includes(providesSlot))
        return false;
    return true;
  }
}
