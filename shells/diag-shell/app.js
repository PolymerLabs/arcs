
import {Utils} from '../lib/utils.js';
import {now} from '../../build/platform/date-web.js';

const buildEntityManifest = entity => `
import 'https://$particles/Pipes/Pipes.recipes'

resource PipeEntityResource
  start
  [{"type": "${entity.type}", "name": "${entity.name}"}]

store LivePipeEntity of PipeEntity 'LivePipeEntity' @0 #pipe_entity #pipe_${entity.type} in PipeEntityResource

recipe Pipe
  use 'LivePipeEntity' #pipe_entity #pipe_${entity.type} as pipe
  Trigger
    pipe = pipe
`;

const logArc = async arc => {
  console.log(`\narc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);
};

export const App = async (composer) => {
  const t0 = now();

  const arc = await Utils.spawn({id: 'smoke-arc', composer});
  console.log(`arc [${arc.id}]`);

  await (async () => {
    //const manifestContent = `import 'https://$particles/Arcs/Login.recipe'`;
    const manifestContent = buildEntityManifest({type: 'com_music_spotify'});
    const manifest = await Utils.parse(manifestContent);
    console.log(`manifest [${manifest.id}]`);
    const recipe = manifest.recipes[0];
    //console.log(`recipe [${recipe.name}]`);
    const plan = await Utils.resolve(arc, recipe);
    await arc.instantiate(plan);
    //console.log(`store [${arc._stores[0].id}]`);
    console.log(`stores`, arc._stores);
  })();

  await (async () => {
    // actual glitch added ~750ms
    //const moreRecipeContent = `import 'https://short-virgo.glitch.me/custom.recipes'`;
    // local files added ~90ms
    const manifestContent = `import 'https://$particles/Glitch/custom.recipes'`;
    const manifest = await Utils.parse(manifestContent);
    console.log(`manifest [${manifest.id}]`, manifest);
    // accrete recipe
    await (async () => {
      const recipe = manifest.allRecipes[0];
      //console.log(`recipe [${recipe.name}]`);
      console.log(String(recipe));
      const plan = await Utils.resolve(arc, recipe);
      await arc.instantiate(plan);
    })();
    //await logArc(arc);
    // accrete recipe
    await (async () => {
      const recipe = manifest.allRecipes[1];
      //console.log(`recipe [${recipe.name}]`);
      console.log(String(recipe));
      const plan = await Utils.resolve(arc, recipe);
      await arc.instantiate(plan);
    })();
    // wait for data to appear
    const cb = async info => {
      //console.log(info);
      if (info.data) {
        console.log(info.data.rawData);
        const dt = now() - t0;
        console.log(`dt = ${dt.toFixed(1)}ms`);
      }
    };
    const store = arc._stores[2];
    store.on('change', cb, arc);
  })();

  const dt = now() - t0;
  console.log(`dt = ${dt.toFixed(1)}ms`);

  await logArc(arc);
  return arc;
};
