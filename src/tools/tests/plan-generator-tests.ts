/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlanGenerator} from '../plan-generator.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {assert} from '../../platform/chai-node.js';

describe('recipe2plan', () => {
  describe('plan-generator', () => {
    async function * dummyGenerator (): AsyncGenerator<Recipe> {
      yield new Recipe();
    }
    it('imports arcs.core.data when the package is different', async () => {
      const generator = new PlanGenerator(dummyGenerator(), 'some.package');

      const actual = await generator.generate();

      assert.include(actual, 'import arcs.core.data.*');
    });
    it('does not import arcs.core.data when the package is the same', async () => {
      const generator = new PlanGenerator(dummyGenerator(), 'arcs.core.data');

      const actual = await generator.generate();

      assert.notInclude(actual, 'import arcs.core.data.*');
    });

  });
});
