import {SyntheticStores} from '../lib/synthetic-stores.js';
import {Context} from './context.js';
import {Pipe} from './pipe.js';
import {Utils} from '../lib/utils.js';

// TODO(sjmiles): why not automatic?
SyntheticStores.init();

let recipes;
let client;
let userContext;
let testMode;

export const DeviceApiFactory = async (storage, deviceClient) => {
  recipes = await marshalRecipeContext();
  console.log('supported types:', recipes.map(recipe => recipe.name.toLowerCase().replace(/_/g, '.')));
  client = deviceClient;
  userContext = new Context(storage);
  return deviceApi;
};

const marshalRecipeContext = async () => {
  const recipeManifest = await Utils.parse(`
import 'https://thorn-egret.glitch.me/custom.recipes'
import 'https://$particles/PipeApps/MapsAutofill.recipes'
  `);
  return recipeManifest.findRecipesByVerb('autofill');
};

const deviceApi = {
  receiveEntity(json) {
    console.log('received entity...');
    receiveJsonEntity(json);
    return true;
  },
  observeEntity(json) {
    console.log('observing entity...');
    observeJsonEntity(json);
    return true;
  },
  flush() {
    console.log('flushing caches...');
    Utils.env.loader.flushCaches();
  }
};

const callback = text => {
  if (testMode) {
    console.log(`foundSuggestions (testMode): "${text}"`);
  } else {
    console.warn(`invoking DeviceClient.foundSuggestions("${text}")`);
    if (client) {
      client.foundSuggestions(text);
    }
  }
};

const receiveJsonEntity = async json => {
  try {
    testMode = !json;
    if (userContext.pipesArc) {
      return await Pipe.receiveEntity(userContext.context, recipes, callback, json);
    }
  } catch (x) {
    console.error(x);
  }
};

const observeJsonEntity = async json => {
  Pipe.observeEntity(userContext.entityStore, json);
};
