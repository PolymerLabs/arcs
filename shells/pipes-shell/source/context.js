/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Utils} from '../../lib/utils.js';

export const requireContext = async manifest => {
  if (!requireContext.promise) {
    requireContext.promise = Utils.parse(manifest);
    window.context = await requireContext.promise;
  }
  return await requireContext.promise;
};

// TODO(sjmiles): live context tools below included so "classic" ingestion demos
// continue to function. These methods are easily removed when the demos are no
// longer important.

export const mirrorStore = async (sourceStore, contextStore) => {
  const change = change => {
    cloneStoreChange(contextStore, change);
  };
  cloneStore(sourceStore, contextStore);
  sourceStore.on(change);
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
