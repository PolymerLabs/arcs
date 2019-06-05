/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {generateId} from '../../../modalities/dom/components/generate-id.js';
import {logFactory} from '../../../build/platform/log-web.js';
import {Utils} from '../../lib/runtime/utils.js';
import {recipeByName, instantiateRecipe, marshalOutput} from '../lib/utils.js';

const log = logFactory('push-arc');

export const marshalPushArc = async (tid, recipeName, composer, context, storage, bus) => {
  log('marshalling new push arc');
  const arc = await instantiatePushArc(generateId(), composer, context, storage);
  extendPushArc(arc, recipeName);
  observeOutput(arc, tid, bus);
  return arc;
};

const instantiatePushArc = async (id, composer, context, storage) => {
  return await Utils.spawn({id, composer, context/*, storage*/});
};

export const extendPushArc = async (arc, recipeName) => {
  if (recipeName) {
    const recipe = recipeByName(arc.context, recipeName);
    if (!recipe) {
      log(`failed to find recipe [${recipeName}]`);
    } else {
      // instantiate requested recipe
      await instantiateRecipe(arc, recipe);
      log(`instantiated recipe [${recipeName}]`);
    }
  }
};

const observeOutput = async (arc, tid, bus) => {
  // TODO(sjmiles): need better system than 20-and-out
  for (let i=0; i<20; i++) {
    const data = await marshalOutput(arc);
    if (data) {
      bus.send({message: 'data', tid, data: JSON.stringify(data.rawData)});
      log(data.rawData);
    }
  }
};
