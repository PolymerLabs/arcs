/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logFactory} from '../../../build/runtime/log-factory.js';
import {RamSlotComposer} from '../../lib/components/ram-slot-composer.js';
import {ArcHost} from '../../lib/components/arc-host.js';

const id = 'pipes-arc';
const manifest = `import 'https://$particles/PipeApps2/BackgroundPipes.recipes'`;

const log = logFactory('pipes-arc');

export const requirePipesArc = async storage => {
  if (!requirePipesArc.promise) {
    requirePipesArc.promise = initPipesArc(storage);
  }
  return requirePipesArc.promise;
};

const initPipesArc = async storage => {
  log('initPipesArc');
  // TODO(sjmiles): use ArcHost because it supports serialization, this core support should be available
  // via something lower-level (Utils? other lib?)
  const host = new ArcHost(null, storage, new RamSlotComposer());
  return await host.spawn({id, manifest});
};
