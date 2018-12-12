
import {Env} from '../lib/arcs.js';

export const App = async (composer) => {
  const arc = await Env.spawn({id: 'smoke-arc', composer});
  console.log(`arc [${arc.id}]`);

  const manifest = await Env.parse(`import 'https://$particles/Arcs/Login.recipe'`);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.findRecipesByVerb('login')[0];
  console.log(`recipe [${recipe.name}]`);

  const plan = await Env.resolve(arc, recipe);
  await arc.instantiate(plan);

  console.log(`store [${arc._stores[0].id}]`);

  console.log(`\narc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);

  return arc;
};
