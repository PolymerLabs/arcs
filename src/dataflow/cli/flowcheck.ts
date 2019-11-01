/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FlowGraph} from '../analysis/flow-graph.js';
import {validateGraph} from '../analysis/analysis.js';
import {Runtime} from '../../runtime/runtime.js';

// TODO make this a function and test it; it's big enough now

(async () => {
  Runtime.init('../../..');
  const filenames = process.argv.slice(2);
  if (filenames.length === 0) {
    console.error('Usage: flowcheck <manifest files>');
    process.exit(1);
  }

  for (const filename of filenames) {
    console.log(`Checking file ${filename}`);
    const manifest = await Runtime.parse(`import '${filename}'`);
    for (const recipe of manifest.allRecipes) {
      console.log(`  Checking recipe ${recipe.name}`);

      if (!recipe.normalize()) {
        console.error(`    Failed to normalize recipe ${recipe.name}`);
        continue;
      }

      if (!recipe.isResolved()) {
        console.error(`    Recipe is not resolved: ${recipe.name}`);
        continue;
      }

      const graph = new FlowGraph(recipe, manifest);
      const result = validateGraph(graph);

      if (result.isValid) {
        console.log('    Data-flow checks passed.');
      } else {
        for (const failure of result.getFailureMessages(graph)) {
          console.error(`    ${failure}`);
        }
      }
    }
  }
})().catch(e => console.error(e));
