/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Type} from '../../../build/runtime/type.js';
import {Planificator} from '../../../build/planning/plan/planificator.js';
import {Utils} from '../../lib/runtime/utils.js';
import {Schemas} from '../schemas.js';
import {devtoolsPlannerInspectorFactory} from '../../../build/devtools-connector/devtools-planner-inspector.js';

export const conformType = type => {
  return (type || 'com.music.spotify').replace(/\./g, '_');
};

export const recipeForType = (type, recipes) => {
  return recipes.find(recipe => recipe.name.toLowerCase() === type);
};

export const storeByTag = (arc, tag) => {
  for (const [key, value] of arc.storeTags) {
    if (value.has(tag)) {
      return key;
    }
  }
};

export const recipeByName = (manifest, name) => {
  return manifest.allRecipes.find(recipe => recipe.name === name);
};

export const createPlanificator = async arc => {
  const options = {
    userid: 'user',
    storageKeyBase: 'volatile',
    onlyConsumer: false,
    debug: true,
    inspectorFactory: devtoolsPlannerInspectorFactory
  };
  const planificator = await Planificator.create(arc, options);
  //
  // setTimeout(async () => {
  //   await planificator.consumer.result.flush();
  //   await planificator.requestPlanning({metadata: {trigger: 'forced'}});
  //   await planificator.loadSuggestions();
  // }, 300);
  //
  //console.log('planificator:', planificator);
  return planificator;
};

export const instantiateRecipe = async (arc, recipe) => {
  const plan = await Utils.resolve(arc, recipe);
  if (plan) {
    await arc.instantiate(plan);
    return plan;
  }
};

export const marshalOutput = async arc => {
  let data;
  let store = arc.__outputStore;
  if (!store) {
    const type = Type.fromLiteral(Schemas.Json);
    const stores = arc.findStoresByType(type);
    store = stores[0];
    if (!store) {
      // wait 1s before resolving
      return new Promise(resolve => setTimeout(resolve, 1000));
    }
    arc.__outputStore = store;
    data = await store.get();
  }
  return new Promise(resolve => {
    if (data) {
      resolve(data);
    } else {
      const change = ({data}) => {
        resolve(data);
      };
      store.on('change', change, {});
    }
  });
};


export const findContainers = tree => {
  const containers = {};
  const slots = tree.querySelectorAll(`[slotid]`);
  slots.forEach(slot => {
    containers[slot.attributes.slotid.value] = slot;
  });
  return containers;
};
