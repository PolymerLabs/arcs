// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Recipe} from '../../runtime/recipe/recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

/*
 * Match free handles (i.e. handles that aren't connected to any connections)
 * to connections.
 */
export class MatchFreeHandlesToConnections extends Strategy {
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandle(recipe, handle) {
        if (handle.connections.length > 0) {
          return;
        }

        const matchingConnections = recipe.getDisconnectedConnections();

        return matchingConnections.map(connection => {
          return (recipe, handle) => {
            const newConnection = recipe.updateToClone({connection}).connection;
            newConnection.connectToHandle(handle);
            return 1;
          };
        });
      }
    }(StrategizerWalker.Permuted), this);
  }
}
