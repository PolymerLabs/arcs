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
import {Producer} from '../utils/hot.js';
import {Type} from '../types/lib-types.js';
import {StorageKey} from './storage/storage-key.js';
import {PropagatedException} from './arc-exceptions.js';

/**
 * ChannelConstructor provides the subset of the particle-execution-context/host API
 * that allows new storage stacks to be established.
 */
export interface ChannelConstructor {
  getStorageProxyMuxer(storageKey: string | StorageKey, type: Type);
  idGenerator: IdGenerator;
  generateID: Producer<string>;
  reportExceptionInHost(exception: PropagatedException);
}
