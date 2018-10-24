export const App = async (env, composer, manifestPath) => {
  const context = await env.parse(`import 'https://$artifacts/canonical.manifest'`);
  console.log(`context [${context.id}]`);

  const manifest = await env.parse(`import 'https://$artifacts/${manifestPath || 'Arcs/Login.recipe'}'`);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.allRecipes[0];
  console.log(`recipe [${recipe.name}]`);

  const arc = await env.spawn({id: 'smoke-arc', composer, context});
  console.log(`arc [${arc.id}]`);

  const plan = await env.resolve(arc, recipe);
  await arc.instantiate(plan);

  console.log(`store [${arc._stores[0].id}]`);
  console.log('serialization:', await arc.serialize());

  return arc;
};
