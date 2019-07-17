/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {addPipeEntity} from '../pipes-api.js';

export const capture = async (msg, tid, bus) => {
  return await addPipeEntity(msg.entity);
};
