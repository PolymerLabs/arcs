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
import {logsFactory} from '../../../build/runtime/log-factory.js';
import {Utils} from '../../lib/runtime/utils.js';
import {createPlanificator, recipeByName, instantiateRecipe, marshalOutput} from '../lib/utils.js';

const {log, warn} = logsFactory('spawn-api', 'navy');

export const marshalArc = async (tid, composer, context, storage, bus) => {
  log('marshalling new arc');
  // construct arc
  const arc = await Utils.spawn({id: generateId(), composer, context/*, storage*/});
  return arc;
};

export const installPlanner = async (tid, bus, arc, suggestionsCallback) => {
  // attach planificator
  const planr = await createPlanificator(arc);
  const callback = suggestionsCallbackFactory(arc, suggestionsCallback);
  planr.registerVisibleSuggestionsChangedCallback(callback);
  log(`[${arc.id.idTreeAsString()}] waiting for planner to suggest something ... might be never!`);
};

const suggestionsCallbackFactory = (arc, callback) => {
  return async suggestions => {
    // TODO(sjmiles): hack
    arc._pipe_suggestions = suggestions;
    //log('got suggestions', suggestions);
    callback(suggestions);
  };
};

export const deliverSuggestions = (tid, bus, suggestions) => {
  const texts = suggestions.map(s => s.descriptionText);
  bus.send({message: 'suggestions', tid, suggestions: texts});
};

export const observeOutput = async (tid, bus, arc) => {
  // TODO(sjmiles): need better system than 20-and-out
  for (let i=0; i<20; i++) {
    const entity = await marshalOutput(arc);
    if (entity) {
      const data = JSON.parse(entity.rawData.json);
      bus.send({message: 'data', tid, data});
    }
  }
};

export const ingestEntity = async (arc, entity) => {
  // instantiate bespoke recipe for entity
  const recipe = await marshalPipeRecipe(entity);
  await instantiateRecipe(arc, recipe);
};

const marshalPipeRecipe = async ({type, source, name}) => {
  source = source ? source.replace(/\./g, '_') : '';
  const manifestContent = buildEntityManifest({type, source, name});
  //log(manifestContent);
  const manifest = await Utils.parse(manifestContent);
  return recipeByName(manifest, 'Pipe');
};

const buildEntityManifest = ({type, source, name}) => `
import 'https://$particles/PipeApps2/Trigger.recipes'
resource PipeEntityResource
  start
  [{"type": "${type}", "name": "${name}", "source": "${source}"}]
store LivePipeEntity of PipeEntity 'LivePipeEntity' @0 #pipe_entity #${type}_${source} in PipeEntityResource
recipe Pipe
  use 'LivePipeEntity' #pipe_entity #${type}_${source} as pipe
  Trigger
    pipe = pipe
`;

export const ingestSuggestion = async (arc, suggestionText) => {
  if (suggestionText) {
    const suggestion = arc._pipe_suggestions.find(suggestion => suggestion.descriptionText == suggestionText);
    if (!suggestion) {
      log(`failed to find suggestion [${suggestionText}]`);
    } else {
      // instantiate requested recipe
      await arc.instantiate(suggestion.plan);
      log(`instantiated suggestion [${suggestionText}]`);
    }
  }
};

export const ingestRecipe = async (arc, recipeName) => {
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
