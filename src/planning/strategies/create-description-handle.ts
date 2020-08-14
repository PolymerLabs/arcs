/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {HandleConnectionSpec} from '../../runtime/manifest-types/particle-spec.js';
import {HandleConnection} from '../../runtime/recipe/handle-connection.js';
import {Particle} from '../../runtime/recipe/particle.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class CreateDescriptionHandle extends Strategy {
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandleConnection(recipe: Recipe, handleConnection: HandleConnection) {
        if (handleConnection.handle) {
          return undefined;
        }
        if (handleConnection.name !== 'descriptions') {
          return undefined;
        }

        return (recipe, handleConnection) => {
          return this._createAndConnectHandle(handleConnection);
        };
      }

      onPotentialHandleConnection(recipe: Recipe, particle: Particle, connectionSpec: HandleConnectionSpec) {
        if (connectionSpec.name !== 'descriptions') {
          return undefined;
        }
        return (recipe, particle, connectionSpec) => {
          return this._createAndConnectHandle(particle.addConnectionName(connectionSpec.name));
        };
      }

      _createAndConnectHandle(handleConnection: HandleConnection): number {
        const handle = handleConnection.recipe.newHandle();
        handle.fate = 'create';
        handleConnection.connectToHandle(handle);
        return 1;
      }
    }(StrategizerWalker.Permuted), this);
  }
}
