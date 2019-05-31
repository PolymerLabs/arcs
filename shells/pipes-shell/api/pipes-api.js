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
import {storeByTag} from '../lib/utils.js';
import {requirePipesArc} from '../lib/pipes-arc.js';
import {initPipeStore, mirrorStore} from '../context.js';

let pipes;
let pipeStore;
let contextPipeStore;

export const marshalPipesArc = async (storage, context) => {
  pipes = await requirePipesArc(storage);
  pipeStore = storeByTag(pipes, 'pipeEntities');
  contextPipeStore = await initPipeStore(context);
  mirrorStore(pipeStore, contextPipeStore);
  console.log('mirroring pipeStore into contextPipeStore');
};

export const addPipeEntity = async (data) => {
  data.timestamp = data.timestamp || Date.now();
  data.source = data.source || 'com.unknown';
  const entity = {
    id: generateId(),
    rawData: data
  };
  console.log('adding pipeEntity', entity);
  await pipeStore.store(entity, [generateId()]);
};

