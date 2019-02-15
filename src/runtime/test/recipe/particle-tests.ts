/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../manifest.js';
import {CollectionType, InterfaceType, TypeVariable} from '../../type.js';

describe('Recipe Particle', () => {
  it('cloning maints type variable mapping', async () => {
    const manifest = await Manifest.parse(`
      interface HostedInterface
        in ~a *

      particle Multiplexer
        host HostedInterface hostedParticle
        in [~a] list

      recipe
        create as items
        Multiplexer
          list = items
    `);

    let recipe = manifest.recipes[0];
    {
      const [recipeParticle] = recipe.particles;
      const hostedParticleConn = recipeParticle.connections['hostedParticle'];
      const listConn = recipeParticle.connections['list'];
      const type = hostedParticleConn.type as InterfaceType;
      const ifaceVariable = type.interfaceInfo.handles[0].type as TypeVariable;

      const listConnType = listConn.type as CollectionType<TypeVariable>;
      const listUnpackedVariable = listConnType.collectionType;
      assert.strictEqual(ifaceVariable.variable, listUnpackedVariable.variable);
    }

    recipe = recipe.clone();
    {
      const recipeParticle = recipe.particles[0];
      const hostedParticleConn = recipeParticle.connections['hostedParticle'];
      const listConn = recipeParticle.connections['list'];
      const type = hostedParticleConn.type as InterfaceType;
      const ifaceVariable = type.interfaceInfo.handles[0].type as TypeVariable;
      const listConnType = listConn.type as CollectionType<TypeVariable>;
      const listUnpackedVariable = listConnType.collectionType;
      assert.strictEqual(ifaceVariable.variable, listUnpackedVariable.variable);
    }
  });
});
