/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe, effectiveTypeForHandle} from '../../runtime/recipe/lib-recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class CreateHandleGroup extends Strategy {

  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onRecipe(recipe: Recipe) {
        // Resolve constraints before assuming connections are free.
        if (recipe.connectionConstraints.length > 0) return undefined;

        const freeConnections = recipe.getFreeConnections();
        let maximalGroup = null;
        for (const writer of freeConnections.filter(({connSpec}) => connSpec.isOutput)) {
          const compatibleConnections = [writer];
          let effectiveType = effectiveTypeForHandle(null, compatibleConnections.map(cc => cc.connSpec));
          let typeCandidate = null;
          const involvedParticles = new Set([writer.particle]);

          let foundSomeReader = false;
          for (const reader of freeConnections.filter(({connSpec}) => connSpec.isInput)) {
            if (!involvedParticles.has(reader.particle) &&
                (typeCandidate = effectiveTypeForHandle(effectiveType, [reader.connSpec])) !== null) {
              compatibleConnections.push(reader);
              involvedParticles.add(reader.particle);
              effectiveType = typeCandidate;
              foundSomeReader = true;
            }
          }

          // Only make a 'create' group for a writer->reader case.
          if (!foundSomeReader) continue;

          for (const otherWriter of freeConnections.filter(({connSpec}) => connSpec.isOutput)) {
            if (!involvedParticles.has(otherWriter.particle) &&
                (typeCandidate = effectiveTypeForHandle(effectiveType, [otherWriter.connSpec])) !== null) {
              compatibleConnections.push(otherWriter);
              involvedParticles.add(otherWriter.particle);
              effectiveType = typeCandidate;
            }
          }

          if (!maximalGroup || compatibleConnections.length > maximalGroup.length) {
            maximalGroup = compatibleConnections;
          }
        }

        if (!maximalGroup) {
          return undefined;
        }
        return (recipe: Recipe) => {
          const newHandle = recipe.newHandle();
          newHandle.fate = 'create';
          for (const {particle, connSpec} of maximalGroup) {
            const cloneParticle = recipe.updateToClone({particle}).particle;
            const conn = cloneParticle.addConnectionName(connSpec.name);
            conn.connectToHandle(newHandle);
          }
          return 0;
        };
      }
    }(StrategizerWalker.Independent), this);
  }
}
