/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageMode, StoreConstructor, ActiveStore} from './store-interface.js';
import {DirectStore} from './direct-store.js';
import {ReferenceModeStore} from './reference-mode-store.js';
import {DirectStoreMuxer} from './direct-store-muxer.js';

// Inject into StoreConstructors to avoid a direct reference to
// ReferenceModeStore from Store, which causes a cyclic dependency.
ActiveStore.constructors = new Map<StorageMode, StoreConstructor>([
    [StorageMode.Direct, DirectStore as StoreConstructor],
    [StorageMode.ReferenceMode, ReferenceModeStore as StoreConstructor],
    [StorageMode.Backing, DirectStoreMuxer as StoreConstructor]
  ]);
