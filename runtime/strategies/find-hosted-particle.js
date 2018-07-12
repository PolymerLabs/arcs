// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {TypeChecker} from '../recipe/type-checker.js';
import {assert} from '../../platform/assert-web.js';

export class FindHostedParticle extends Strategy {

  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(inputParams) {
    let arc = this._arc;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandleConnection(recipe, connection) {
        if (connection.direction !== 'host' || connection.handle) return;
        assert(connection.type.isInterface);

        let results = [];
        for (let particle of arc.context.particles) {
          // This is what shape.particleMatches() does, but we also do
          // canEnsureResolved at the end:
          let shapeClone = connection.type.interfaceShape.cloneWithResolutions(new Map());
          // If particle doesn't match the requested shape.
          if (shapeClone.restrictType(particle) === false) continue;
          // If we still have unresolvable shape after matching a particle.
          // This can happen if both shape and particle have type variables.
          // TODO: What to do here? We need concrete type for the particle spec
          //       handle, but we don't have one.
          if (!shapeClone.canEnsureResolved()) continue;

          results.push((recipe, hc) => {
            // Restricting the type of the connection to the concrete particle
            // may restrict type variable across the recipe.
            hc.type.interfaceShape.restrictType(particle);

            // The connection type may still have type variables:
            // E.g. if shape requires `in ~a *`
            //      and particle has `in Entity input`
            //      then type system has to ensure ~a is at least Entity.
            // The type of a handle hosting the particle literal has to be
            // concrete, so we concretize connection type with maybeEnsureResolved().
            const handleType = hc.type.clone(new Map());
            handleType.maybeEnsureResolved();

            const id = `${arc.id}:particle-literal:${particle.name}`;

            // Reuse a handle if we already hold this particle spec in the recipe.
            for (let handle of recipe.handles) {
              if (handle.id === id && handle.fate === 'copy'
                  && handle._mappedType && handle._mappedType.equals(handleType)) {
                hc.connectToHandle(handle);
                return;
              }
            }

            // TODO: Add a digest of a particle literal to the ID, so that we
            //       can ensure we load the correct particle. It is currently
            //       hard as digest is asynchronous and recipe walker is
            //       synchronous.
            let handle = recipe.newHandle();
            handle._mappedType = handleType;
            handle.fate = 'copy';
            handle.id = id;
            hc.connectToHandle(handle);
          });
        }
        return results;
      }
    }(Walker.Permuted), this);
  }
}
