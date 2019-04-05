/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {Id} from '../id.js';

export async function manifestTestSetup() {
  const registry = {};
  const loader = new Loader();
  const manifest = await Manifest.load('./src/runtime/test/artifacts/test.manifest', loader, registry);
  assert(manifest);
  const arc = new Arc({id: new Id('test'), context: manifest, loader});
  const recipe = manifest.recipes[0];
  assert(recipe.normalize());
  assert(recipe.isResolved());
  return {arc, recipe};
}
