
/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Utils} from '../lib/utils.js';

export const App = async (composer) => {
  const arc = await Utils.spawn({id: 'smoke-arc', composer});
  console.log(`arc [${arc.id}]`);

  const manifest = await Utils.parse(`import 'https://$particles/Arcs/Login.arcs'`);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.findRecipesByVerb('login')[0];
  console.log(`recipe [${recipe.name}]`);

  const plan = await Utils.resolve(arc, recipe);
  await arc.instantiate(plan);

  console.log(`store [${arc._stores[0].id}]`);

  console.log(`\narc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);

  return arc;
};
