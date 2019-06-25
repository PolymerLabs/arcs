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
import {Utils} from '../../lib/runtime/utils.js';
import {recipeByName, marshalOutput} from '../lib/utils.js';
import {logsFactory} from '../../../build/runtime/log-factory.js';

const {warn} = logsFactory('pipe');

export const autofill = async (msg, tid, bus, composerFactory, storage, context) => {
  if (validateAutofillMsg(msg)) {
    const entity = msg.entity;
    const type = entity.type;
    const tag = `${type}_autofill`;
    const handler = context.allRecipes.find(r => r.verbs.includes(tag));
    if (!handler) {
      warn(`found no autofill verbs for type [${type}]`);
    } else {
      // arc
      const composer = composerFactory(msg.modality);
      const arc = await Utils.spawn({id: generateId(), composer, context/*, storage*/});
      // recipe
      const source = entity.source ? entity.source.replace(/\./g, '_') : '';
      const name = entity.name;
      const recipe = await marshalPipeRecipe({type, source, name, tag});
      // instantiate
      if (await instantiateRecipe(arc, recipe)) {
        if (await instantiateRecipe(arc, handler)) {
          // watch for output, deliver to bus
          observeOutput(tid, bus, arc);
        }
      }
    }
  }
};

const validateAutofillMsg = msg => {
  if (msg.entity && msg.entity.type) {
    return true;
  }
  // TODO(sjmiles): complain
  return false;
};

const instantiateRecipe = async (arc, recipe) => {
  const plan = await Utils.resolve(arc, recipe);
  if (!plan) {
    warn('failed to resolve recipe', recipe);
    return false;
  }
  await arc.instantiate(plan);
  return true;
};

const marshalPipeRecipe = async ({type, source, name, tag}) => {
  const manifestContent = buildEntityManifest({type, source, name}, tag);
  const manifest = await Utils.parse(manifestContent);
  return recipeByName(manifest, 'Pipe');
};

const buildEntityManifest = ({type, source, name}, tag) => `
import 'https://$particles/PipeApps2/Trigger.recipes'
resource PipeEntityResource
  start
  [{"type": "${type}", "name": "${name}", "source": "${source}"}]
store LivePipeEntity of PipeEntity 'LivePipeEntity' @0 #pipe_entity #${tag} in PipeEntityResource
recipe Pipe
  use 'LivePipeEntity' #pipe_entity #${tag} as pipe
  Trigger
    pipe = pipe
`;

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
