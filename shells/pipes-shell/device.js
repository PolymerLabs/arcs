/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {SyntheticStores} from '../lib/synthetic-stores.js';
import {Context} from './context.js';
import {Pipe} from './pipe.js';
import {Utils} from '../lib/utils.js';

const defaultManifest = `
import 'https://thorn-egret.glitch.me/custom.recipes'
import 'https://$particles/PipeApps/MapsAutofill.recipes'
`;

// TODO(sjmiles): why not automatic?
SyntheticStores.init();

let recipes;
let client;
let userContext;
let testMode;

export const DeviceApiFactory = async (storage, manifest, deviceClient) => {
  client = deviceClient;
  recipes = await marshalRecipeContext(manifest || defaultManifest);
  console.log('supported types:', recipes.map(recipe => recipe.name.toLowerCase().replace(/_/g, '.')));
  userContext = new Context(storage);
  await signalClientWhenReady(deviceClient);
  return deviceApi;
};

const signalClientWhenReady = async client => {
  // inform client when shell is ready
  const ready = client && client.shellReady;
  if (ready) {
    await userContext.isReady;
    ready.call(client);
  }
};

const marshalRecipeContext = async manifest => {
  const recipeManifest = await Utils.parse(manifest);
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
