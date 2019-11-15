/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Runtime} from '../../build/runtime/runtime.js';

export const App = async (composer, manifestPath) => {
  const context = await Runtime.parse(`
import 'https://$particles/canonical.arcs'
import 'https://$particles/Profile/Sharing.recipe'
  `);
  console.log(`context [${context.id}]`);

  const manifest = await Runtime.parse(`import 'https://$particles/${manifestPath || 'Arcs/Login.recipe'}'`);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.allRecipes[0];
  console.log(`recipe [${recipe.name}]`);

  const arc = await Runtime.spawnArc({id: 'smoke-arc', composer, context});
  console.log(`arc [${arc.id}]`);

  const plan = await Runtime.resolveRecipe(arc, recipe);
  await arc.instantiate(plan);

  if (arc._stores[0]) {
    console.log(`store [${arc._stores[0].id}]`);
  }
  console.log('serialization:', await arc.serialize());

  return arc;
};

