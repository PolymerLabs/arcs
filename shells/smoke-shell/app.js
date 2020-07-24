
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
import {Modality} from '../../build/runtime/modality.js';

export const App = async (composer, path) => {
  const arc = await Runtime.spawnArc({id: 'smoke-arc', composer});
  arc.modality = Modality.dom;
  console.log(`arc [${arc.id}]`);
  //
  const manifest = await Runtime.parse(`import 'https://$particles/${path}'`);
  console.log(`manifest [${manifest.id}]`);
  //
  //const recipe = manifest.findRecipesByVerb('login')[0];
  // paramterize?
  const recipe = manifest.allRecipes[0];
  //
  console.log(`recipe [${recipe?.name}]`);
  if (recipe) {
    const plan = await Runtime.resolveRecipe(arc, recipe);
    if (plan) {
      await arc.instantiate(plan);
    }
  }
  console.log(`\narc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);
  //
  return arc;
};
