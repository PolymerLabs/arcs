/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Handle} from '../recipe/handle.js';

export interface HandleRetriever {
  // Given an Arcs manifest as string, the implementation should return
  // an array of any Handles in the resulting parsed Manifest object or
  // the empty list if none were present. On parse error the promise
  // should reject with error detail.
  getHandlesFromManifest(content: string) : Promise<Handle[]>;
}
