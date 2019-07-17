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
import {storeByTag} from './lib/utils.js';
import {requirePipesArc} from './lib/pipes-arc.js';
import {initPipeStore, mirrorStore} from './context.js';

let pipes;
let pipeStore;
let contextPipeStore;

export const marshalPipesArc = async (storage, context) => {
  // canonical arc to hold observed pipes entities
  pipes = await requirePipesArc(storage);
  // access the pipe store directly
  pipeStore = storeByTag(pipes, 'pipeEntities');
  // create a context store
  contextPipeStore = await initPipeStore(context);
  // mirror pipeStore entities into contextPipeStore, emulating
  // the sharing mechanism implemented in fancier context impls
  mirrorStore(pipeStore, contextPipeStore);
  console.log('mirroring pipeStore into contextPipeStore');
};

export const addPipeEntity = async data => {
  // ensure there is a timestamp
  data.timestamp = data.timestamp || Date.now();
  // ensure there is a source value
  data.source = data.source || 'com.unknown';
  // construct an Entity
  const entity = {
    id: generateId(),
    rawData: data
  };
  // add to pipeStore
  console.log('adding pipeEntity', entity);
  await pipeStore.store(entity, [generateId()]);
};

