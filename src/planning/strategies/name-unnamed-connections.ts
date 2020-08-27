/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StrategizerWalker, Strategy} from '../strategizer.js';

export class NameUnnamedConnections extends Strategy {
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandleConnection(recipe, handleConnection) {
        if (handleConnection.name) {
          // it is already named.
          return;
        }

        if (!handleConnection.particle.spec) {
          // the particle doesn't have spec yet.
          return;
        }

        const possibleSpecConns = handleConnection.findSpecsForUnnamedHandles();

        return possibleSpecConns.map(specConn => {
          return (recipe, handleConnection) => {
            handleConnection.particle.nameConnection(handleConnection, specConn.name);
            return 1;
          };
        });
      }
    }(StrategizerWalker.Permuted), this);
  }
}
