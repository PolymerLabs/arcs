/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {generateId} from '../../../../modalities/dom/components/generate-id.js';
import {Utils} from '../../../lib/runtime/utils.js';
import {recipeByName, marshalOutput} from '../lib/utils.js';
import {logsFactory} from '../../../../build/runtime/log-factory.js';
import {Stores} from '../../../lib/runtime/stores.js';
import {Schemas} from '../schemas.js';
import {portIndustry} from '../pec-port.js';

const {warn} = logsFactory('pipe');

export const process = async ({type, tag, source, name, modality}, tid, bus, composerFactory, storage, context) => {
  const action = context.allRecipes.find(r => r.verbs.includes(tag));
  if (!action) {
    warn(`found no verbs matching [${tag}]`);
  } else {
    // arc
    const composer = composerFactory(modality);
    const portFactories = [portIndustry(bus)];
    const arc = await Utils.spawn({id: generateId(), composer, context/*, storage*/, portFactories});
    // install pipe data
    await constructPipeData(arc, {type, name, source}, tag);
    // construct ingestion recipe
    const ingest = await marshalPipeRecipe({type, source, name}, tag);
    // instantiate recipes
    if (await instantiateRecipe(arc, ingest)) {
      if (await instantiateRecipe(arc, action)) {
        // watch for output, forward to bus
        observeOutput(tid, bus, arc);
      }
    }
  }
};

const constructPipeData = async (arc, data, tag) => {
  // create store
  const store = await Stores.create(arc, {
    name: 'LivePipeEntity',
    id: 'LivePipeEntity',
    schema: Schemas.PipeEntity,
    isCollection: false,
    tags: [`pipe_entity`, tag],
    storageKey: null
  });
  const entity = {
    id: generateId(),
    rawData: data
  };
  store.set(entity, [Math.random()]);
};

const marshalPipeRecipe = async ({type, name, source}, tag) => {
  const manifest = await Utils.parse(buildEntityManifest({type, source, name}, tag));
  return recipeByName(manifest, 'Pipe');
};

const buildEntityManifest = ({type, source, name}, tag) => `
import 'https://$particles/PipeApps2/Trigger.arcs'

recipe Pipe
  //use 'LivePipeEntity' #pipe_entity #${tag} as pipe
  use as pipe
  Trigger
    pipe = pipe
`;

//resource PipeEntityResource
//  start
//  [{"type": "${type}", "name": "${name}", "source": "${source}"}]
//store LivePipeEntity of PipeEntity 'LivePipeEntity' @0 #pipe_entity #${tag} in PipeEntityResource

const instantiateRecipe = async (arc, recipe) => {
  const plan = await Utils.resolve(arc, recipe);
  if (!plan) {
    warn('failed to resolve recipe');
    return false;
  }
  await arc.instantiate(plan);
  return true;
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
