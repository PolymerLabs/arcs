// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Walker} from '../recipe/walker.js';
import {Recipe} from '../recipe/recipe.js';

/*
 * Match free handles (i.e. handles that aren't connected to any connections)
 * to connections.
 */
export class MatchFreeHandlesToConnections extends Strategy {
  async generate(inputParams) {
    let self = this;

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (handle.connections.length > 0)
          return;

        let matchingConnections = recipe.handleConnections.filter(connection => connection.handle == undefined && connection.name !== 'descriptions');

        return matchingConnections.map(connection => {
          return (recipe, handle) => {
            let newConnection = recipe.updateToClone({connection}).connection;
            newConnection.connectToHandle(handle);
            return 1;
          };
        });
      }
    }(Walker.Permuted), this);
  }
}
