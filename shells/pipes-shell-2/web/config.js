/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export {paths} from './paths.js';

export let manifest;
const params = (new URL(document.location)).searchParams;
if (params.has('solo')) {
  manifest = `import '${params.get('solo')}'`;
}

//export const storage = `volatile`;
export const storage = `volatile://`;
//export const storage = `pouchdb://local/arcs/`;
export const version = `version: may-31`;
