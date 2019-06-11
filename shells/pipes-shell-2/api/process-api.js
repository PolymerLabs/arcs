/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {logsFactory} from '../../../build/runtime/log-factory.js';
import {Utils} from '../../lib/runtime/utils.js';
import {generateId} from '../../../modalities/dom/components/generate-id.js';
import {recipeByName, createPlanificator, instantiateRecipe, marshalOutput} from '../lib/utils.js';

const {log, warn} = logsFactory('process-api', '#5341f4');

export const marshalProcessArc = async (entity, composer, context, storage) => {
  log('marshalling new process arc');
  // construct arc
  const arc = await instantiateProcessArc(generateId(), composer, context, storage);
  // instantiate bespoke recipe for entity
  const recipe = await marshalPipeRecipe(entity);
  instantiateRecipe(arc, recipe);
  // attach planificator
  const planr = await createPlanificator(arc);
  log('waiting for planner to suggest something ... might be never!');
  planr.registerVisibleSuggestionsChangedCallback(suggestionsCallbackFactory(arc, planr, entity));
};

const suggestionsCallbackFactory = (arc, planr, entity) => {
  return async suggestions => {
    planr.dispose();
    const suggest = suggestions.shift();
    if (!suggest) {
      warn('failed to find recipe for', entity);
    } else {
      if (suggestions.length) {
        warn('found multiple recipes for', entity, suggestions.map(s => s.descriptionText));
      }
      log(`instantiating suggestion [${suggest.descriptionText}]`);
      await arc.instantiate(suggest.plan);
      const data = await marshalOutput(arc);
      if (data) {
        log(data.rawData);
      }
    }
  };
};

const marshalPipeRecipe = async ({type, source, name}) => {
  source = source ? source.replace(/\./g, '_') : '';
  const manifestContent = buildEntityManifest({type, source, name});
  //log(manifestContent);
  const manifest = await Utils.parse(manifestContent);
  return recipeByName(manifest, 'Pipe');
};

const instantiateProcessArc = async (id, composer, context) => {
  return await Utils.spawn({id, composer, context});
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
