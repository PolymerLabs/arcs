/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProxy} from './storage-proxy.js';
import {HandleOld} from './handle.js';

// Inject the function to allocate a NoOpStorageProxy, in order to remove
// the dependency on StorageProxy from handle.js.
HandleOld.noOpStorageAllocator = StorageProxy.newNoOpProxy;
