// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {StrategizerWalker, Strategy} from '../../planning/strategizer.js';
import {Recipe} from '../recipe/recipe.js';

export class CreateDescriptionHandle extends Strategy {
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandleConnection(recipe, handleConnection) {
        if (handleConnection.handle) {
          return undefined;
        }
        if (handleConnection.name !== 'descriptions') {
          return undefined;
        }

        return (recipe, handleConnection) => {
          const handle = recipe.newHandle();
          handle.fate = 'create';
          handleConnection.connectToHandle(handle);
          return 1;
        };
      }
    }(StrategizerWalker.Permuted), this);
  }
}
