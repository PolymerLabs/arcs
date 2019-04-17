/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {now} from '../../build/platform/date-web.js';
import {logFactory} from '../../build/platform/log-web.js';
import {Utils} from '../lib/runtime/utils.js';
import {RamSlotComposer} from '../lib/components/ram-slot-composer.js';
import {generateId} from '../../modalities/dom/components/generate-id.js';

const log = logFactory('Pipe');

let t0;

export const Pipe = {
  async observeEntity(store, json) {
    //log('observeEntity', Boolean(store), json);
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
      //dumpStores([store]);
    }
  },
  async receiveEntity(context, recipes, callback, json) {
    //log('receiveEntity', json);
    t0 = now();
    const type = extractType(json);
    const recipe = recipeForType(type, recipes);
    if (recipe) {
      return instantiateAutofillArc(context, type, recipe, callback);
    } else {
      log(`found no autofill recipe for type [${type}]`);
    }
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
  const entity = fromJson(json);
  return (entity ? entity.type : 'com.music.spotify').replace(/\./g, '_');
};

const recipeForType = (type, recipes) => {
  return recipes.find(recipe => recipe.name.toLowerCase() === type);
};

const instantiateAutofillArc = async (context, type, recipe, callback) => {
  const arc = await Utils.spawn({id: 'piping-arc', composer: new RamSlotComposer(), context});
  log(`arc [${arc.id}]`);
  await instantiatePipeRecipe(arc, type);
  // TODO(sjmiles): `clone()` because recipe cannot `normalize()` twice
  await instantiateAutofillRecipe(arc, recipe.clone(), callback);
  return arc;
};

const instantiateAutofillRecipe = async (arc, recipe, callback) => {
  await instantiateRecipe(arc, recipe);
  // wait for data to appear
  // TODO(sjmiles): find a better way to locate the important store
  const store = arc._stores[2];
  watchOneChange(store, callback, arc);
  //await dumpStores(arc._stores);
};

const instantiatePipeRecipe = async (arc, type) => {
  const manifestContent = buildEntityManifest({type});
  const manifest = await Utils.parse(manifestContent);
  const recipe = recipeByName(manifest, 'Pipe');
  await instantiateRecipe(arc, recipe);
};

const logArc = async arc => {
  log(`\narc serialization`);
  log(`==================================`);
  log(await arc.serialize());
  log(`==================================`);
};

const instantiateRecipe = async (arc, recipe) => {
  const plan = await Utils.resolve(arc, recipe);
  await arc.instantiate(plan);
};

const recipeByName = (manifest, name) => {
  return manifest.allRecipes.find(recipe => recipe.name === name);
};

const watchOneChange = (store, callback, arc) => {
  const cb = info => {
    onChange(arc, info, callback);
    store.off('change', cb);
    arc.dispose();
  };
  store.on('change', cb, arc);
};

const onChange = (arc, change, callback) => {
  //log(change);
  if (change.data) {
    const data = change.data.rawData;
    const text = data.json || data.text || data.address;
    callback(arc, text);
    //log(text);
    const dt = now() - t0;
    //log(`dt = ${dt.toFixed(1)}ms`);
    if (typeof document != 'undefined') {
      document.body.appendChild(Object.assign(document.createElement('div'), {
        style: `padding: 16px;`,
        innerText: `[${arc.id}] ${text}\n\n${dt.toFixed(1)}ms`
      }));
    }
  }
};

const buildEntityManifest = entity => `
import 'https://$particles/PipeApps/Trigger.recipes'

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
      let value;
      if (store.type.isCollection) {
        value = await store.toList();
      } else {
        value = await store.get();
      }
      log(`store #${i}:`, store.id, value);
    }
  }));
};
