/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import Manifest from '../../manifest.js';
import StrategyTestHelper from './strategy-test-helper.js';
import GroupHandleConnections from '../../strategies/group-handle-connections.js';
import {assert} from '../chai-web.js';

describe('GroupHandleConnections', function() {
  let schemaAndParticlesStr = `
    schema Thing
    schema OtherThing
    particle A
      A(in Thing ithingA1)
    particle B
      B(in Thing ithingB1, in Thing ithingB2, in [OtherThing] iotherthingB1)
    particle C
      C(in Thing ithingC1, out Thing othingC2, inout [OtherThing] iootherthingC1)
    particle D
      D(in Thing ithingD1, in Thing ithingD2, out Thing othingD3)
    particle E
      E(out Thing othingE1)
      `;
  it('group in and out view connections', async () => {
    // TODO: add another Type view connections to the recipe!
    let manifest = (await Manifest.parse(`
      ${schemaAndParticlesStr}
      recipe
        A
        B
        C
        D
    `));
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let ghc = new GroupHandleConnections();

    let results = await ghc.generate(inputParams);
    assert.equal(results.length, 1);
    let recipe = results[0].result;
    assert.equal(4, recipe.handles.length);
    // Verify all connections are bound to handles.
    assert.isUndefined(recipe.handleConnections.find(hc => !hc.handle));
    // Verify all handles have non-empty connections list.
    assert.isUndefined(recipe.handles.find(v => v.connections.length == 0));
  });
  it('does nothing if no grouping is possible', async () => {
    // TODO: add another Type view connections to the recipe!
    let manifest = (await Manifest.parse(`
      ${schemaAndParticlesStr}
      recipe
        create as thing
        E
          othingE1 -> thing
        A
          ithingA1 <- thing
        B
    `));
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let ghc = new GroupHandleConnections();

    let results = await ghc.generate(inputParams);
    assert.lengthOf(results, 0);
  });
});
