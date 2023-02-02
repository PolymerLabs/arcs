/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const listenToStore = (store, onchange) => {
  // observe changes
  store.on(onchange);
  // record ability to stop observation
  return () => store.off(onchange);
};

export const getStoreData = async store => {
  return store.toList ? store.toList() : store.get();
};

export const forEachEntity = async (store, fn) => {
  const data = store.toList ? await store.toList() : [await store.get()];
  data.forEach(value => value && fn(value));
};

export const simpleNameOfType = type => type.getEntitySchema().names[0];

export const nameOfType = type => {
  let typeName = type.getEntitySchema().names[0];
  if (type.isCollection) {
    typeName = `[${typeName}]`;
  }
  return typeName;
};

// export const getBoxTypeSpec = store => {
//   return store.type.getEntitySchema().type.toString();
// };

export const boxes = {};

export const crackStorageKey = storage => {
  // TODO(sjmiles): cheating?
  const parts = storage.split('/');
  const base = parts.slice(0, -3).join('/');
  const arcid = parts.slice(-3, -2).pop();
  const id = parts.slice(-1).pop();
  return {base, arcid, id};
};
