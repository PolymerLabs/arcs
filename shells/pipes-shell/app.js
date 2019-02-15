
import {Utils} from '../lib/utils.js';
import {now} from '../../build/platform/date-web.js';

let t0;

export const App = async (composer, callback) => {
  t0 = now();

  const arc = await Utils.spawn({id: 'smoke-arc', composer});
  console.log(`arc [${arc.id}]`);
  console.log(`dt = ${(now() - t0).toFixed(1)}ms`);

  //com_google_android_apps_maps(arc);
  com_music_spotify(arc, callback);

  const dt = now() - t0;
  //console.log(`dt = ${dt.toFixed(1)}ms`);

  //await logArc(arc);
  return arc;
};

const com_music_spotify = async (arc, callback) => {
  await (async () => {
    const manifestContent = buildEntityManifest({type: 'com_music_spotify'});
    const manifest = await Utils.parse(manifestContent);
    await instantiateRecipe(arc, manifest, 'Pipe');
  })();
  await (async () => {
    // actual glitch added ~750ms
    //const moreRecipeContent = `import 'https://short-virgo.glitch.me/custom.recipes'`;
    // local files added ~90ms
    //const manifestContent = `import 'https://$particles/Glitch/custom.recipes'`;
    const manifest = await Utils.parse(`import 'https://$particles/Glitch/custom.recipes'`);
    //console.log(`manifest [${manifest.id}]`, manifest);
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'RandomArtist');
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'SuggestForSpotify');
    // wait for data to appear
    const store = arc._stores[2];
    store.on('change', info => onChange(info, callback), arc);
  })();
};

const com_google_android_apps_maps = async arc => {
  await (async () => {
    const manifestContent = buildEntityManifest({type: 'com_google_android_apps_maps'});
    const manifest = await Utils.parse(manifestContent);
    await instantiateRecipe(arc, manifest, 'Pipe');
  })();
  await (async () => {
    // actual glitch added ~750ms
    //const moreRecipeContent = `import 'https://short-virgo.glitch.me/custom.recipes'`;
    // local files added ~90ms
    const manifest = await Utils.parse(`import 'https://$particles/Apps/MapQuery.recipes'`);
    //console.log(`manifest [${manifest.id}]`, manifest);
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'RecentAddresses');
    // accrete recipe
    //await instantiateRecipe(arc, manifest, 'SuggestForSpotify');
    // wait for data to appear
    //console.log(arc._stores);
    const store = arc._stores[2];
    store.on('change', onChange, arc);
  })();
};

const logArc = async arc => {
  console.log(`\narc serialization`);
  console.log(`=============================================================================`);
  console.log(await arc.serialize());
  console.log(`=============================================================================`);
};

const recipeByName = (manifest, name) => {
  return manifest.allRecipes.find(recipe => recipe.name === name);
};

const instantiateRecipe = async (arc, manifest, name) => {
  const recipe = recipeByName(manifest, name);
  //const recipe = manifest.allRecipes[0];
  //console.log(`recipe [${recipe.name}]`);
  //console.log(String(recipe));
  const plan = await Utils.resolve(arc, recipe);
  await arc.instantiate(plan);
  // TODO(sjmiles): necessary for iOS
  //await logArc(arc);
};

const onChange = (change, callback) => {
  //console.log(change, callback.toString());
  if (change.data) {
    const text = change.data.rawData.text;
    callback(text);
    //console.log(text);
    const dt = now() - t0;
    console.log(`dt = ${dt.toFixed(1)}ms`);
    if (typeof document != 'undefined') {
      document.body.appendChild(Object.assign(document.createElement('div'), {
        style: `padding: 16px;`,
        innerText: `${text}\n\n${dt.toFixed(1)}ms`
      }));
    }
  }
};

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
