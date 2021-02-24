
/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Runtime} from '../../../build/runtime/runtime.js';
import {Modality} from '../../../build/runtime/arcs-types/modality.js';

export const App = async (runtime, composer, path) => {
  const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'smoke-arc', composer}));
  arc.modality = Modality.dom;
  console.log(`arc [${arc.id}]`);
  //
  const manifest = await runtime.parse(`import 'https://$particles/${path}'`);
  console.log(`manifest [${manifest.id}]`);
  //
  //const recipe = manifest.findRecipesByVerb('login')[0];
  // paramterize?
  const recipe = manifest.allRecipes[0];
  //
  if (recipe) {
    console.log(`recipe [${recipe.name}]`);
    await runtime.allocator.runPlanInArc(arc.id, recipe);
  }
  //
  console.log(`\narc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);
  //
  return arc;
};
