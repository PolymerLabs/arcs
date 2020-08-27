/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe} from '../../runtime/recipe/lib-recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class AddMissingHandles extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onRecipe(recipe: Recipe) {
        // Don't add use handles while there are outstanding constraints
        if (recipe.connectionConstraints.length > 0) {
          return undefined;
        }
        // Don't add use handles to a recipe with free handles
        if (recipe.getFreeHandles().length > 0) {
          return undefined;
        }

        // TODO: "description" handles are always created, and in the future they need to be "optional" (blocked by optional handles
        // not being properly supported in arc instantiation). For now just hardcode skiping them.
        const disconnectedConnections = recipe.getFreeConnections();
        if (disconnectedConnections.length === 0) {
          return undefined;
        }

        return (recipe: Recipe) => {
          disconnectedConnections.forEach(({particle, connSpec}) => {
            const cloneParticle = recipe.updateToClone({particle}).particle;
            const handleConnection = cloneParticle.addConnectionName(connSpec.name);
            const handle = recipe.newHandle();
            handle.fate = '?';
            handleConnection.connectToHandle(handle);
          });
          return 0;
        };
      }
    }(StrategizerWalker.Permuted), this);
  }
}
