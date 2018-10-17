export const App = async (env, composer, manifestFile) => {
  const context = await env.parse(`import 'https://$artifacts/canonical.manifest'`);
  console.log(`context [${context.id}]`);

  const content = `import 'https://$artifacts/${manifestFile || 'Arcs/Login.recipe'}'`;
  const manifest = await env.parse(content);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.recipes[0];
  console.log(`recipe [${recipe.name}]`);

  const arc = await env.spawn({id: 'smoke-arc', composer, context});
  console.log(`arc [${arc.id}]`);

  const plan = await env.resolve(arc, recipe);
  await arc.instantiate(plan);

  console.log(`store [${arc._stores[0].id}]`);
  console.log(`\n`);

  console.log(`=============================================================================`);
  console.log(`arc serialization:`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);

  return arc;
};
