export const App = async (env, composer) => {

  const manifest = await env.parse(`import 'https://$artifacts/Arcs/Login.recipe'`);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.findRecipesByVerb('login')[0];
  console.log(`recipe [${recipe.name}]`);

  const arc = await env.spawn({id: 'smoke-arc', composer});
  console.log(`arc [${arc.id}]`);

  const plan = await env.resolve(arc, recipe);
  await arc.instantiate(plan);
  
  console.log(`store [${arc._stores[0].id}]`);
  console.log(`\n`);
  console.log(`arc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);

  return arc;
};
