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

const manifest = `
import './canonical.manifest'
//import 'https://$particles/PipeApps/PipeApps.arcs'
//import 'https://$particles/Notification/Notification.arcs'
//import 'https://$particles/Restaurants/Restaurants.arcs'
`;

export const requireContext = async () => {
  if (!requireContext.promise) {
    requireContext.promise = Utils.parse(manifest);
    window.context = await requireContext.promise;
  }
  return await requireContext.promise;
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
