import {Utils} from '../lib/utils.js';
import {now} from '../../build/platform/date-web.js';

let t0;

const log = (...args) => {
  //console.log(args.join(' '));
  console.log(...args);
  //document.body.appendChild(document.createElement('div')).innerText = args.join();
};

export const App = async (composer, context, callback, json) => {
  t0 = now();
  const arc = await Utils.spawn({id: 'piping-arc', composer, context});
  window.arc = arc;
  log(`arc [${arc.id}]`);
  dispatch(extractType(json), arc, callback);
  return arc;
};

const extractType = json => {
  let type = 'com.music.spotify';
  if (json) {
    try {
      const entity = JSON.parse(json) || Object;
      type = entity.type;
    } catch (x) {
      //
    }
  }
  return type;
};

const dispatch = (type, arc, callback) => {
  switch (type) {
    case 'com.google.android.apps.maps':
      com_google_android_apps_maps(arc, callback);
      break;
    case 'com.music.spotify':
    default:
      com_music_spotify(arc, callback);
      break;
  }
};

const com_music_spotify = async (arc, callback) => {
  await (async () => {
    const manifestContent = buildEntityManifest({type: 'com_music_spotify'});
    const manifest = await Utils.parse(manifestContent);
    await instantiateRecipe(arc, manifest, 'Pipe');
  })();
  await (async () => {
    const manifest = await Utils.parse(`import 'https://$particles/Glitch/custom.recipes'`);
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'RandomArtist');
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'SuggestForSpotify');
    // wait for data to appear
    const store = arc._stores[2];
    store.on('change', info => onChange(info, callback), arc);
    //dumpStores(arc._stores);
  })();
};

const com_google_android_apps_maps = async (arc, callback) => {
  await (async () => {
    const manifestContent = buildEntityManifest({type: 'com_google_android_apps_maps'});
    const manifest = await Utils.parse(manifestContent);
    await instantiateRecipe(arc, manifest, 'Pipe');
  })();
  await (async () => {
    //const manifest = await Utils.parse(`import 'https://$particles/Apps/MapQuery.recipes'`);
    const manifest = await Utils.parse(`import 'https://$particles/PipeApps/MapsApp.recipes'`);
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'RecentAddresses');
    // wait for data to appear
    await dumpStores(arc.context.allStores);
    await dumpStores(arc._stores);
    const store = arc._stores[1];
    store.on('change', info => onChange(info, callback), arc);
  })();
};

const logArc = async arc => {
  log(`\narc serialization`);
  log(`==================================`);
  log(await arc.serialize());
  log(`==================================`);
};

const recipeByName = (manifest, name) => {
  return manifest.allRecipes.find(recipe => recipe.name === name);
};

const instantiateRecipe = async (arc, manifest, name) => {
  const recipe = recipeByName(manifest, name);
  if (!recipe) {
    log(`couldn't find recipe "${name}" in manifest`);
  } else {
    //log(`recipe [${recipe.name}]`);
    //log(String(recipe));
    const plan = await Utils.resolve(arc, recipe);
    await arc.instantiate(plan);
    // TODO(sjmiles): necessary for iOS (!?)
    //await logArc(arc);
  }
};

const onChange = (change, callback) => {
  //log(change, callback.toString());
  if (change.data) {
    const text = change.data.rawData.text || change.data.rawData.address;
    callback(text);
    //log(text);
    const dt = now() - t0;
    //log(`dt = ${dt.toFixed(1)}ms`);
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

const dumpStores = async stores => {
  log(`stores dump, length = ${stores.length}`);
  await Promise.all(stores.map(async (store, i) => {
    if (store) {
      if (store.get) {
        log(`store #${i}:`, store.id, await store.get());
      } else if (store.toList) {
        log(`store #${i}:`, store.id, await store.toList());
      }
    }
  }));
};
