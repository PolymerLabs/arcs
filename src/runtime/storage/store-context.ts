/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Type} from '../type.js';
import {AbstractStore} from './abstract-store.js';

export interface StoreContext {
  context?: StoreContext;
  findStoresByType<T extends Type>(type: T, options?: { tags: string[], subtype?: boolean }): AbstractStore[];
  findStoreById(id: string): AbstractStore;
}
