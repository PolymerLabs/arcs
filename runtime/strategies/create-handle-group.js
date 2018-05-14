// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {Handle} from '../recipe/handle.js';

export class CreateHandleGroup extends Strategy {

  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onRecipe(recipe) {
        // Resolve constraints before assuming connections are free.
        if (recipe.connectionConstraints.length > 0) return;

        const freeConnections = recipe.handleConnections.filter(hc => !hc.handle && !hc.isOptional);
        let maximalGroup = null;
        for (let writer of freeConnections.filter(hc => hc.isOutput)) {
          let compatibleConnections = [writer];
          let effectiveType = Handle.effectiveType(null, compatibleConnections);
          let typeCandidate = null;
          let involvedParticles = new Set([writer.particle]);

          let foundSomeReader = false;
          for (let reader of freeConnections.filter(hc => hc.isInput)) {
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

          for (let otherWriter of freeConnections.filter(hc => hc.isOutput)) {
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

        if (maximalGroup) return recipe => {
          let newHandle = recipe.newHandle();
          newHandle.fate = 'create';
          for (let conn of maximalGroup) {
            let cloneConn = recipe.updateToClone({conn}).conn;
            cloneConn.connectToHandle(newHandle);
          }
        };
      }
    }(Walker.Independent), this);
  }
}
