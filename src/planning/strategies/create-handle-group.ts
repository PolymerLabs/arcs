// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Handle} from '../../runtime/recipe/handle.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class CreateHandleGroup extends Strategy {

  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onRecipe(recipe: Recipe, result) {
        // Resolve constraints before assuming connections are free.
        if (recipe.connectionConstraints.length > 0) return undefined;

        const freeConnections = recipe.getFreeConnections();
        let maximalGroup = null;
        for (const writer of freeConnections.filter(hc => hc.isOutput)) {
          const compatibleConnections = [writer];
          let effectiveType = Handle.effectiveType(null, compatibleConnections);
          let typeCandidate = null;
          const involvedParticles = new Set([writer.particle]);

          let foundSomeReader = false;
          for (const reader of freeConnections.filter(hc => hc.isInput)) {
            if (!involvedParticles.has(reader.particle) &&
                (typeCandidate = Handle.effectiveType(effectiveType, [reader])) !== null) {
              compatibleConnections.push(reader);
              involvedParticles.add(reader.particle);
              effectiveType = typeCandidate;
              foundSomeReader = true;
            }
          }

          // Only make a 'create' group for a writer->reader case.
          if (!foundSomeReader) continue;

          for (const otherWriter of freeConnections.filter(hc => hc.isOutput)) {
            if (!involvedParticles.has(otherWriter.particle) &&
                (typeCandidate = Handle.effectiveType(effectiveType, [otherWriter])) !== null) {
              compatibleConnections.push(otherWriter);
              involvedParticles.add(otherWriter.particle);
              effectiveType = typeCandidate;
            }
          }

          if (!maximalGroup || compatibleConnections.length > maximalGroup.length) {
            maximalGroup = compatibleConnections;
          }
        }

        if (maximalGroup) {
          return recipe => {
            const newHandle = recipe.newHandle();
            newHandle.fate = 'create';
            for (const conn of maximalGroup) {
              const cloneConn = recipe.updateToClone({conn}).conn;
              cloneConn.connectToHandle(newHandle);
            }
          };
        }
        return undefined;
      }
    }(StrategizerWalker.Independent), this);
  }
}
