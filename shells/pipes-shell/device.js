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
import {logFactory} from '../../build/platform/log-web.js';

const log = logFactory('Device');
const warn = logFactory('Device', null, 'warn');

const defaultManifest = `
import 'https://thorn-egret.glitch.me/custom.recipes'
import 'https://$particles/PipeApps/canonical.recipes'
`;

// TODO(sjmiles): why not automatic?
SyntheticStores.init();

let recipes;
let client;
let userContext;
let testMode;
let recipeManifest;

export const ShellApiFactory = async (storage, manifest, deviceClient) => {
  recipeManifest = manifest || defaultManifest;
  client = deviceClient;
  await marshalRecipeContext();
  userContext = new Context(storage);
  await signalClientWhenReady(deviceClient);
  return shellApi;
};

const signalClientWhenReady = async client => {
  // inform client when shell is ready, if possible
  if (client) {
    const ready = client.shellReady;
    if (ready) {
      await userContext.isReady;
      ready.call(client);
    }
  }
};

const marshalRecipeContext = async () => {
  const manifest = await Utils.parse(recipeManifest);
  recipes = manifest.findRecipesByVerb('autofill');
  const types = recipes.map(recipe => recipe.name.toLowerCase().replace(/_/g, '.'));
  const json = JSON.stringify(types);
  log(`> DeviceClient.notifyAutofillTypes('${json}')`);
  if (client) {
    client.notifyAutofillTypes(json);
  }
};

const shellApi = {
  receiveEntity(json) {
    const id = trackTransactionId(() => receiveJsonEntity(json));
    log(`[${id}]: received entity`, json);
    return id;
  },
  observeEntity(json) {
    log('observing entity', json);
    observeJsonEntity(json);
    return true;
  },
  flush() {
    log('flushing caches');
    Utils.env.loader.flushCaches();
    marshalRecipeContext();
  }
};

const transactionIds = [];

const trackTransactionId = async => {
  const id = transactionIds.push(0);
  async().then(arcid => transactionIds[id-1] = arcid);
  return id;
};

const recoverTransactionId = arc => {
  const arcid = String(arc.id);
  return transactionIds.findIndex(id => id === arcid) + 1;
};

const observeJsonEntity = async json => {
  Pipe.observeEntity(userContext.entityStore, json);
};

const receiveJsonEntity = async json => {
  try {
    testMode = !json;
    if (userContext.pipesArc) {
      const arc = await Pipe.receiveEntity(userContext.context, recipes, foundSuggestions, json);
      return String(arc.id);
    }
  } catch (x) {
    console.error(x);
  }
};

const foundSuggestions = (arc, text) => {
  const id = recoverTransactionId(arc);
  if (testMode) {
    console.log(`[testMode] foundSuggestions("${id}", "${text}")`);
  } else {
    console.warn(`invoking DeviceClient.foundSuggestions("${id}", "${text}")`);
    if (client) {
      client.foundSuggestions(id, text);
    }
  }
};

