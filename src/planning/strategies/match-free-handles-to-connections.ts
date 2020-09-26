/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {HandleConnectionSpec} from '../../runtime/arcs-types/particle-spec.js';
import {Recipe, Particle} from '../../runtime/recipe/lib-recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

/*
 * Match free handles (i.e. handles that aren't connected to any connections)
 * to connections.
 */
export class MatchFreeHandlesToConnections extends Strategy {
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onPotentialHandleConnection(recipe: Recipe, particle: Particle, connectionSpec: HandleConnectionSpec) {
        const freeHandles = recipe.handles.filter(h => h.connections.length === 0);

        return freeHandles.map(handle => {
          return (recipe: Recipe, particle: Particle, connectionSpec: HandleConnectionSpec) => {
            const cloneHandle = recipe.updateToClone({handle}).handle;
            particle.addConnectionName(connectionSpec.name).connectToHandle(cloneHandle);
            return 1;
          };
        });
      }
    }(StrategizerWalker.Permuted), this);
  }
}
