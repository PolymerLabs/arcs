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

import {Arc} from '../../arc.js';
import {Manifest} from '../../manifest.js';
import {InitPopulation} from '../../strategies/init-population.js';
import {assert} from '../chai-web.js';

describe('InitPopulation', async () => {
  it('penalizes resolution of particles that already exist in the arc', async () => {
    let manifest = await Manifest.parse(`
      schema Product

      particle A in 'A.js'
        in Product product

      recipe
        create as handle1
        A
          product <- handle1`);
    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    let arc = new Arc({id: 'test-plan-arc', context: {recipes: [recipe]}});
    await arc.instantiate(recipe);
    let ip = new InitPopulation(arc);

    let inputParams = {generated: [], generation: 0};
    let results = await ip.generate(inputParams);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 0);
  });
});
