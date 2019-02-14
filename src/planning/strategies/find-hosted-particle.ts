// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Arc} from '../../runtime/arc.js';
import {ConnectionSpec, ParticleSpec} from '../../runtime/particle-spec.js';
import {HandleConnection} from '../../runtime/recipe/handle-connection.js';
import {Particle} from '../../runtime/recipe/particle';
import {RecipeUtil} from '../../runtime/recipe/recipe-util.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {InterfaceType, Type} from '../../runtime/type.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class FindHostedParticle extends Strategy {
  async generate(inputParams) {
    const arc = this.arc;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      // onHandleConnection(recipe: Recipe, connection: HandleConnection) {
      //   const matchingParticleSpecs = this._findMatchingParticleSpecs(arc, connection.spec, connection, connection.type);
      //   if (!matchingParticleSpecs) {
      //     return undefined;
      //   }
      //   const results = [];
      //   for (const particleSpec of matchingParticleSpecs) {
      //     results.push((recipe, hc) => {
      //       const handle = RecipeUtil.constructImmediateValueHandle(
      //         hc, particleSpec, arc.generateID());
      //       assert(handle); // Type matching should have been ensure by the checks above;
      //       hc.connectToHandle(handle);
      //     });
      //   }
      //   return results;
      // }

      // TODO: Temporarily unused. Once interface connections no longer created eagerly.
      // (see particle.ts comment in set spec), uncomment this and delete onHandleConnection
      onPotentialHandleConnection(recipe: Recipe, particle: Particle, connectionSpec: ConnectionSpec) {
        const matchingParticleSpecs = this._findMatchingParticleSpecs(
            arc, connectionSpec, /* connection= */ null, connectionSpec.type);
        if (!matchingParticleSpecs) {
          return undefined;
        }
        const results = [];
        for (const particleSpec of matchingParticleSpecs) {
          results.push((recipe, particle, connectionSpec) => {
            const handleConnection = particle.addConnectionName(connectionSpec.name);
            const handle = RecipeUtil.constructImmediateValueHandle(
                handleConnection, particleSpec, arc.generateID());
            assert(handle); // Type matching should have been ensure by the checks above;
            handleConnection.connectToHandle(handle);
          });
        }
        return results;
      }

      private _findMatchingParticleSpecs(arc: Arc, connectionSpec: ConnectionSpec,
          handleConnection: HandleConnection, connectionType: Type): ParticleSpec[] {
        if (!connectionSpec) {
          return undefined;
        }
        if (connectionSpec.direction !== 'host') {
          return undefined;
        }
        if (handleConnection && handleConnection.handle) {
          return undefined;
        }
        assert(connectionType instanceof InterfaceType);
        const iface = connectionType as InterfaceType;
        const particles: ParticleSpec[] = [];
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

          particles.push(particle);
        }
        return particles;
      }

    }(StrategizerWalker.Permuted), this);
  }
}
