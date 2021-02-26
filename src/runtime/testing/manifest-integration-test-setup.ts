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
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {Id, ArcId} from '../id.js';
import {Runtime} from '../runtime.js';

export async function manifestTestSetup() {
  const registry = {};
  const loader = new Loader();
  const manifest = await Manifest.load('./src/runtime/tests/artifacts/test.manifest', loader, registry);
  assert(manifest);
  const runtime = new Runtime({loader, context: manifest});
  const arc = runtime.newArc({arcName: 'test'});
  const recipe = manifest.recipes[0];
  assert(recipe.normalize());
  assert(recipe.isResolved());
  return {runtime, arc, recipe};
}
