/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import glob from 'glob';
import {assert} from '../../platform/chai-web.js';
import {Runtime} from '../../runtime/runtime.js';
import {analyseDataflow} from '../../dataflow/analysis/analysis.js';

// Checks that all of the Dataflow example recipes successfully pass dataflow
// analysis.
describe('Dataflow example recipes', () => {
  let runtime;

  const filenames = glob.sync('particles/Dataflow/*.arcs');
  for (const filename of filenames) {
      before(() => {
        runtime = new Runtime();
      });

      it(`passes dataflow analysis: ${filename}`, async () => {
      const manifest = await runtime.parseFile(filename);
      for (const recipe of manifest.recipes) {
        recipe.normalize();
        const [_graph, result] = analyseDataflow(recipe, manifest);
        assert.isTrue(result.isValid);
      }
    });
  }
});
