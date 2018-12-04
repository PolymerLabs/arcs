// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {Arc} from '../arc.js';
import {assert} from '../../../platform/assert-web.js';
import {HandleConnection} from '../recipe/handle-connection.js';
import {InterfaceType} from '../type.js';
import {RecipeUtil} from '../recipe/recipe-util.js';

export class FindHostedParticle extends Strategy {

  async generate(inputParams) {
    const arc = this.arc;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandleConnection(recipe: Recipe, connection: HandleConnection) {
        if (connection.direction !== 'host' || connection.handle) return undefined;
        assert(connection.type instanceof InterfaceType);
        const iface = connection.type as InterfaceType;

        const results = [];
        for (const particle of arc.context.particles) {
          // This is what shape.particleMatches() does, but we also do
          // canEnsureResolved at the end:
          const shapeClone = iface.interfaceInfo.cloneWithResolutions(new Map());
          // If particle doesn't match the requested shape.
          if (shapeClone.restrictType(particle) === false) continue;
          // If we still have unresolvable shape after matching a particle.
          // This can happen if both shape and particle have type variables.
          // TODO: What to do here? We need concrete type for the particle spec
          //       handle, but we don't have one.
          if (!shapeClone.canEnsureResolved()) continue;

          results.push((recipe, hc) => {
            const handle = RecipeUtil.constructImmediateValueHandle(
              hc, particle, arc.generateID());
            assert(handle); // Type matching should have been ensure by the checks above;
            hc.connectToHandle(handle);
          });
        }
        return results;
      }
    }(Walker.Permuted), this);
  }
}
