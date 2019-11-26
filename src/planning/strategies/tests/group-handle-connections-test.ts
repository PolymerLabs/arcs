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
import {Manifest} from '../../../runtime/manifest.js';
import {GroupHandleConnections} from '../../strategies/group-handle-connections.js';

describe('GroupHandleConnections', () => {
  const schemaAndParticlesStr = `
      schema Thing
      schema OtherThing
      particle A
        ithingA1: reads Thing
      particle B
        ithingB1: reads Thing
        ithingB2: reads Thing
        iotherthingB1: reads [OtherThing]
      particle C
        ithingC1: reads Thing
        othingC2: writes Thing
        iootherthingC1: reads writes [OtherThing]
      particle D
        ithingD1: reads Thing
        ithingD2: reads Thing
        othingD3: writes Thing
      particle E
        othingE1: writes Thing
      `;
  it('group in and out handle connections', async () => {
    // TODO: add another Type handle connections to the recipe!
    const manifest = (await Manifest.parse(`
${schemaAndParticlesStr}
      recipe
        A
        B
        C
        D
    `));
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    const ghc = new GroupHandleConnections();

    const results = await ghc.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.lengthOf(recipe.handles, 4);
    // Verify all connections are bound to handles.
    assert.isUndefined(recipe.handleConnections.find(hc => !hc.handle));
    // Verify all handles have non-empty connections list.
    assert.isUndefined(recipe.handles.find(v => v.connections.length === 0));
  });
  it('does nothing if no grouping is possible', async () => {
    // TODO: add another Type handle connections to the recipe!
    const manifest = (await Manifest.parse(`
      ${schemaAndParticlesStr}
      recipe
        thing: create *
        E
          othingE1: writes thing
        A
          ithingA1: reads thing
        B
    `));
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    const ghc = new GroupHandleConnections();

    const results = await ghc.generate(inputParams);
    assert.isEmpty(results);
  });
});
