// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';

export class NameUnnamedConnections extends Strategy {
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandleConnection(recipe, handleConnection) {
        if (handleConnection.name)
          return; // it is already named.

        if (!handleConnection.particle.spec)
          return; // the particle doesn't have spec yet.

        let possibleSpecConns = handleConnection.particle.spec.connections.filter(specConn => {
          // filter specs with matching types that don't have handles bound to the corresponding handle connection.
          return !specConn.isOptional &&
                 handleConnection.handle.type.equals(specConn.type) &&
                 !handleConnection.particle.getConnectionByName(specConn.name).handle;
        });

        return possibleSpecConns.map(specConn => {
          return (recipe, handleConnection) => {
            handleConnection.particle.nameConnection(handleConnection, specConn.name);
            return 1;
          };
        });
      }
    }(Walker.Permuted), this);
  }
}
