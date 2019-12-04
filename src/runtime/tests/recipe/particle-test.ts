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
import {TypeChecker} from '../../recipe/type-checker.js';
import {CollectionType, InterfaceType, TypeVariable} from '../../type.js';

describe('Recipe Particle', () => {
  it('cloning maints type variable mapping', async () => {
    const manifest = await Manifest.parse(`
      interface HostedInterface
        reads ~a

      particle Multiplexer
        hostedParticle: hosts HostedInterface
        list: reads [~a]

      recipe
        items: create *
        Multiplexer
          list: items
    `);

    let recipe = manifest.recipes[0];
    {
      const [recipeParticle] = recipe.particles;
      const hostedParticleConn = recipeParticle.spec.getConnectionByName('hostedParticle');
      const type = hostedParticleConn.type as InterfaceType;
      const ifaceVariable = type.interfaceInfo.handleConnections[0].type as TypeVariable;

      const listConn = recipeParticle.connections['list'];
      const listConnType = listConn.type as CollectionType<TypeVariable>;
      const listUnpackedVariable = listConnType.collectionType;
      assert.strictEqual(ifaceVariable.variable, listUnpackedVariable.variable);
    }

    recipe = recipe.clone();
    {
      const recipeParticle = recipe.particles[0];
      const hostedParticleConn = recipeParticle.spec.getConnectionByName('hostedParticle');
      const listConn = recipeParticle.connections['list'];
      const type = hostedParticleConn.type as InterfaceType;
      const ifaceVariable = type.interfaceInfo.handleConnections[0].type as TypeVariable;
      const listConnType = listConn.type as CollectionType<TypeVariable>;
      const listUnpackedVariable = listConnType.collectionType;
      assert.isTrue(TypeChecker.compareTypes({type: ifaceVariable}, {type: listUnpackedVariable}));
      assert.strictEqual(ifaceVariable.variable, listUnpackedVariable.variable);
    }
  });
  it('verifies is resolved for optional connections', async () =>  {
    const particleManifest = `
      schema Thing
      particle P
        thing0: writes? Thing
          thing1: writes Thing
            thing2: writes Thing
    `;
    const verifyRecipe = async (recipeManifest, expectedResolved) => {
      const manifest = await Manifest.parse(`${particleManifest}${recipeManifest}`);
      const recipe = manifest.recipes[0];
      assert.isTrue(recipe.normalize());
      assert.strictEqual(recipe.isResolved(), expectedResolved);
    };
    await verifyRecipe(`
      recipe
        P
    `, true);
    await verifyRecipe(`
      recipe
        handle0: create *
        P
          thing0: handle0
    `, false);
    await verifyRecipe(`
      recipe
        handle0: create *
        handle1: create *
        P
          thing0: handle0
          thing1: handle1
    `, false);
  });
});
