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

import {Manifest} from '../../manifest.js';
import {CreateDescriptionHandle} from '../../strategies/create-description-handle.js';
import {assert} from '../chai-web.js';

describe('CreateDescriptionHandle', function() {
  it('descriptions handle created', async () => {
    let manifest = (await Manifest.parse(`
      schema Description
      particle DoSomething in 'AA.js'
        out [Description] descriptions

      recipe
        DoSomething as particle0
    `));
    let recipe = manifest.recipes[0];
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    let strategy = new CreateDescriptionHandle();
    let results = (await strategy.generate(inputParams));

    assert.equal(results.length, 1);
    let plan = results[0].result;
    assert.equal(plan.handles.length, 1);
    assert.equal('create', plan.handles[0].fate);
    assert.isTrue(plan.isResolved());
  });
});
