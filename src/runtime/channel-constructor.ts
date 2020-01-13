/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {IdGenerator} from './id.js';
import {Producer} from './hot.js';
import {Type} from './type.js';
import {StorageKey} from './storageNG/storage-key.js';

export interface ChannelConstructor {
  getStorageProxy(storageKey: string | StorageKey, type: Type);
  idGenerator: IdGenerator;
  generateID: Producer<string>;
}
