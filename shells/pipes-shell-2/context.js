/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Utils} from '../lib/runtime/utils.js';
import {Stores} from '../lib/runtime/stores.js';
import {Schemas} from './schemas.js';

const manifest = `
import 'https://$particles/PipeApps2/PipeApps.recipes'
`;

export const requireContext = async () => {
  if (!requireContext.promise) {
    requireContext.promise = marshalContext(manifest);
  }
  return await requireContext.promise;
};

const marshalContext = async manifest => {
  const context = await Utils.parse(manifest);
  return context;
};

// TODO(sjmiles): a proper context would construct stores based on the observed types, not
// create them a-priori ... I'm cheating here cuz I want to close the circuit
// Come back and fix ASAP

export const initPipeStore = async context => {
  return await Stores.create(context, {
    name: 'pipe-entities',
    id: 'pipe-entities',
    schema: Schemas.PipeEntity,
    isCollection: true,
    tags: null,
    storageKey: null
  });
};

export const mirrorStore = async (sourceStore, contextStore) => {
  const change = change => {
    cloneStoreChange(contextStore, change);
  };
  cloneStore(sourceStore, contextStore);
  sourceStore.on('change', change, {});
};

const cloneStore = async (sourceStore, contextStore) => {
  const change = {add: []};
  const values = await sourceStore.toList();
  if (values.length) {
    values.forEach(value => change.add.push({value}));
    cloneStoreChange(contextStore, change);
  }
};

const cloneStoreChange = async (store, change) => {
  console.log('mirroring store change', change);
  if (store && change.add) {
    await Promise.all(change.add.map(async add => store.store(add.value, [Math.random()])));
  }
};


