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
const {params} = global;
if ('solo' in params) {
  manifest = `import '${params.solo}'`;
}

export const storage = `volatile://`;
//export const storage = `pouchdb://local/arcs/`;
export const version = `version: apr-30`;
