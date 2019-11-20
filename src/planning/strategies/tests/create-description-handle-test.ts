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
import {CreateDescriptionHandle} from '../../strategies/create-description-handle.js';

describe('CreateDescriptionHandle', () => {
  it('descriptions handle created', async () => {
    const manifest = (await Manifest.parse(`
      schema Description
      particle DoSomething in 'AA.js'
        descriptions: writes [Description]

      recipe
        DoSomething as particle0
    `));
    const recipe = manifest.recipes[0];
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    const strategy = new CreateDescriptionHandle();
    const results = (await strategy.generate(inputParams));

    assert.lengthOf(results, 1);
    const plan = results[0].result;
    assert.lengthOf(plan.handles, 1);
    assert.strictEqual('create', plan.handles[0].fate);
    assert.isTrue(plan.isResolved());
  });
});
