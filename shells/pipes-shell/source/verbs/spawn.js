/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {generateId} from '../../../../modalities/dom/components/generate-id.js';
import {Runtime} from '../../../../build/runtime/runtime.js';
import {recipeByName, instantiateRecipe} from '../lib/utils.js';
import {portIndustry} from '../pec-port.js';
import {logsFactory} from '../../../../build/platform/logs-factory.js';
import {devtoolsArcInspectorFactory} from '../../../../build/devtools-connector/devtools-arc-inspector.js';

const {warn} = logsFactory('pipe');

export const spawn = async ({modality, recipe}, tid, bus, composerFactory, storage, context) => {
  const contextRecipe = recipeByName(context, recipe);
  if (recipe && !contextRecipe) {
    warn(`found no recipes matching [${recipe}]`);
    return null;
  } else {
    // instantiate arc
    const arc = await Runtime.spawnArc({
      context,
      //storage,
      id: generateId(),
      composer: composerFactory(modality, bus, tid),
      portFactories: [portIndustry(bus)],
      inspectorFactory: devtoolsArcInspectorFactory,
    });
    if (contextRecipe) {
      // instantiate optional recipe
      await instantiateRecipe(arc, contextRecipe);
    }
    return arc;
  }
};
