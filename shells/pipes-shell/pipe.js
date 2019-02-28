import {Utils} from '../lib/utils.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {generateId} from '../../modalities/dom/components/generate-id.js';
import {now} from '../../build/platform/date-web.js';

let t0;

const log = (...args) => {
  //console.log(args.join(' '));
  console.log(...args);
  //document.body.appendChild(document.createElement('div')).innerText = args.join();
};

export const Pipe = {
  async observeEntity(store, json) {
    console.log('Pipe::observeEntity', store, json);
    const data = fromJson(json);
    if (store && data) {
      if (!data.timestamp) {
        data.timestamp = Date.now();
        data.source = 'com.unknown';
      }
      const entity = {
        id: generateId(),
        rawData: data
      };
      await store.store(entity, [now()]);
      dumpStores([store]);
    }
  },
  async receiveEntity(context, callback, json) {
    console.log('Pipe::receiveEntity', json);
    t0 = now();
    const data = fromJson(json);
    const composer = new RamSlotComposer();
    const arc = await Utils.spawn({id: 'piping-arc', composer, context});
    log(`arc [${arc.id}]`);
    dispatch(extractType(json), arc, callback);
    return arc;
  }
};

const fromJson = json => {
  try {
    return JSON.parse(json);
  } catch (x) {
    return null;
  }
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
    const manifest = await Utils.parse(`import 'https://$particles/PipeApps/ArtistAutofill.recipes'`);
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'ArtistAutofill');
    // wait for data to appear
    const store = arc._stores[2];
    watchOneChange(store, callback, arc);
    //await dumpStores(arc._stores);
  })();
};

const com_google_android_apps_maps = async (arc, callback) => {
  await (async () => {
    const manifestContent = buildEntityManifest({type: 'com_google_android_apps_maps'});
    const manifest = await Utils.parse(manifestContent);
    await instantiateRecipe(arc, manifest, 'Pipe');
  })();
  await (async () => {
    const manifest = await Utils.parse(`import 'https://$particles/PipeApps/MapsApp.recipes'`);
    // accrete recipe
    await instantiateRecipe(arc, manifest, 'RecentAddresses');
    // wait for data to appear
    const store = arc._stores[1];
    watchOneChange(store, callback, arc);
    //await dumpStores(arc.context._stores);
    //await dumpStores(arc._stores);
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

const watchOneChange = (store, callback, arc) => {
  const cb = info => {
    onChange(info, callback);
    store.off('change', cb);
    arc.dispose();
  };
  store.on('change', cb, arc);
};

const onChange = (change, callback) => {
  //log(change, callback.toString());
  log(change);
  if (change.data) {
    const data = change.data.rawData;
    const text = data.json || data.text || data.address;
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
  console.log(`stores dump, length = ${stores.length}`);
  await Promise.all(stores.map(async (store, i) => {
    if (store) {
      let value;
      if (store.type.isCollection) {
        value = await store.toList();
      } else {
        value = await store.get();
      }
      console.log(`store #${i}:`, store.id, value);
    }
  }));
};
