// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {StrategizerWalker, Strategy} from '../strategizer.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {Particle} from '../../runtime/recipe/particle.js';
import {SlotUtils} from '../../runtime/recipe/slot-utils.js';

export class FindRequiredParticle extends Strategy {

  async generate(inputParams) {
    const arc = this.arc;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onRequiredParticle(recipe: Recipe, particle: Particle) {
        // TODO: This strategy only matches particles based on slots, and only slots in the recipe gets modified. 
        //       This strategy should do the same for handles as well. 
        const particlesMatch: Particle[] = arc.activeRecipe.particles.filter(arcParticle => particle.matches(arcParticle));
        
        return particlesMatch.map(particleMatch => ((recipe: Recipe, particle: Particle) => {
          if (!particle.matches(particleMatch)) return;
          for (const [name,slotConn] of Object.entries(particle.consumedSlotConnections)) {
            const oldSlot = slotConn.targetSlot;
            const newSlot = particleMatch.consumedSlotConnections[name].targetSlot;
            if (!SlotUtils.replaceOldSlot(recipe, oldSlot, newSlot)) return;

            for (const [pname, oldPSlot] of Object.entries(slotConn.providedSlots)) {
              const pslot = particleMatch.consumedSlotConnections[name].providedSlots[pname];
              if (!SlotUtils.replaceOldSlot(recipe, oldPSlot, pslot)) return;
            }
            
            // remove particle from require section 
            for (const requires of recipe.requires) {
              if (requires.particles.indexOf(particle) !== -1) {
                requires.removeParticle(particle);
              }
            }
          }
        }));
      }
    }(StrategizerWalker.Permuted), this);
  }
}