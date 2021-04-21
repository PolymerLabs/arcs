/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe, Particle, replaceOldSlot} from '../../runtime/recipe/lib-recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';
import {GenerateParams, Descendant} from '../../utils/lib-utils.js';

export class FindRequiredParticle extends Strategy {

  async generate(inputParams: GenerateParams<Recipe>): Promise<Descendant<Recipe>[]> {
    const arcInfo = this.arcInfo;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onRequiredParticle(_recipe: Recipe, particle: Particle) {
        // TODO: This strategy only matches particles based on slots, and only slots in the recipe gets modified.
        //       This strategy should do the same for handles as well.
        const particlesMatch: Particle[] = arcInfo.activeRecipe.particles.filter(arcParticle => particle.matches(arcParticle));

        return particlesMatch.map(particleMatch => ((recipe: Recipe, particle: Particle) => {
          if (!particle.matches(particleMatch)) return undefined;
          for (const slotConn of particle.getSlotConnections()) {
            const oldSlot = slotConn.targetSlot;
            const matchedSlotConn = particleMatch.getSlotConnectionByName(slotConn.name);
            const newSlot = matchedSlotConn.targetSlot;
            if (!replaceOldSlot(oldSlot, newSlot)) return undefined;

            for (const [pname, oldPSlot] of Object.entries(slotConn.providedSlots)) {
              const pslot = matchedSlotConn.providedSlots[pname];
              if (!replaceOldSlot(oldPSlot, pslot)) return undefined;
            }

            // remove particle from require section
            for (const requires of recipe.requires) {
              if (requires.particles.indexOf(particle) !== -1) {
                requires.removeParticle(particle);
              }
            }
          }
          return 0;
        }));
      }
    }(StrategizerWalker.Permuted), this);
  }
}
