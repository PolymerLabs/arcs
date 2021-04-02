/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../../build/platform/logs-factory.js';
import {matchesRecipe} from '../../../../build/runtime/recipe/lib-recipe.js';
import {devtoolsArcInspectorFactory} from '../../../../build/devtools-connector/devtools-arc-inspector.js';
import {Runtime} from '../../../../build/runtime/runtime.js';
import {portIndustry} from '../pec-port.js';

const {log, warn} = logsFactory('runArc');

// This implementation was forked from verbs/spawn.js

export const runArc = async (msg, bus, runtime, defaultStorageKeyPrefix) => {
  const {recipe, arcId, storageKeyPrefix, pecId, particles} = msg;
  const action = runtime.context.allRecipes.find(r => r.name === recipe);
  if (!arcId) {
    warn(`arcId must be provided.`);
    return null;
  }
  if (recipe && !action) {
    warn(`found no recipes matching [${recipe}]`);
    return null;
  }
  const arcInfo = await runtime.allocator.startArc({
    arcName: arcId,
    storageKeyPrefix: storageKeyPrefix || defaultStorageKeyPrefix,
    fileName: './serialized.manifest',
    pecFactories: [runtime.pecFactory, portIndustry(bus, pecId)],
    loader: runtime.loader,
    inspectorFactory: devtoolsArcInspectorFactory,
    slotObserver: {
      observe: (content, arc) => {
        bus.send({message: 'output', data: content});
      },
      dispose: () => null
    }
  });
  // optionally instantiate recipe
  if (action) {
    const plan = await runtime.resolveRecipe(arcInfo, action);
    await runtime.allocator.runPlanInArc(arcInfo, plan);
    log(`successfully instantiated ${plan} in ${arcInfo.id}`);
  }
  return runtime.getArcById(arcInfo.id);;
};
