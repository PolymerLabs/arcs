// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {StrategizerWalker, Strategy} from '../strategizer.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {Arc} from '../../runtime/arc.js';
import {assert} from '../../platform/assert-web.js';
import {HandleConnection} from '../../runtime/recipe/handle-connection.js';
import {InterfaceType} from '../../runtime/type.js';
import {RecipeUtil} from '../../runtime/recipe/recipe-util.js';

export class FindHostedParticle extends Strategy {

  async generate(inputParams) {
    const arc = this.arc;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandleConnection(recipe: Recipe, connection: HandleConnection) {
        if (connection.direction !== 'host' || connection.handle) return undefined;
        assert(connection.type instanceof InterfaceType);
        const iface = connection.type as InterfaceType;

        const results = [];
        for (const particle of arc.context.allParticles) {
          // This is what interfaceInfo.particleMatches() does, but we also do
          // canEnsureResolved at the end:
          const ifaceClone = iface.interfaceInfo.cloneWithResolutions(new Map());
          // If particle doesn't match the requested interface.
          if (ifaceClone.restrictType(particle) === false) continue;
          // If we still have unresolvable interface after matching a particle.
          // This can happen if both interface and particle have type variables.
          // TODO: What to do here? We need concrete type for the particle spec
          //       handle, but we don't have one.
          if (!ifaceClone.canEnsureResolved()) continue;

          results.push((recipe, hc) => {
            const handle = RecipeUtil.constructImmediateValueHandle(
              hc, particle, arc.generateID());
            assert(handle); // Type matching should have been ensure by the checks above;
            hc.connectToHandle(handle);
          });
        }
        return results;
      }
    }(StrategizerWalker.Permuted), this);
  }
}
