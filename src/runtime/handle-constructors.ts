/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SingletonHandle, CollectionHandle} from './storage/handle.js';
import {SingletonType, CollectionType, MuxType} from './type.js';
import {EntityHandleFactory} from './storage/entity-handle-factory.js';

// We inject SingletonHandle and CollectionHandle constructors into the
// corresponding types to avoid type.js depending on storage/handle.js.
SingletonType.handleClass = SingletonHandle;
CollectionType.handleClass = CollectionHandle;
MuxType.handleClass = EntityHandleFactory;
