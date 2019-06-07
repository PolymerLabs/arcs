/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const {params} = global;

export const manifest = ('solo' in params) ? `import '${params.solo}'` : null;
export const test = ('test' in params);

export {paths} from './paths.js';

export const storage = `volatile://`;
//export const storage = `pouchdb://local/arcs/`;
export const version = `version: jun-7`;
