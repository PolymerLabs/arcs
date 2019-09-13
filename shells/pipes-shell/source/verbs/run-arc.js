/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../../build/runtime/log-factory.js';
import {RecipeUtil} from '../../../../build/runtime/recipe/recipe-util.js';
import {Utils} from '../../../lib/utils.js';
import {devtoolsArcInspectorFactory} from '../../../../build/devtools-connector/devtools-arc-inspector.js';
import {portIndustry} from '../pec-port.js';

const {log, warn} = logsFactory('pipe');

// The implementation was forked from verbs/spawn.js
export const runArc = async (msg, tid, bus, runtime, env) => {
  const {recipe, arcid, storageKeyPrefix, pecid} = msg;
  const action = runtime.context.allRecipes.find(r => r.name === recipe);
  if (!arcid) {
    warn(`arcid must be provided.`);
    return null;    
  }
  if (recipe && !action) {
    warn(`found no recipes matching [${recipe}]`);
    return null;
  }
  const arc = runtime.runArc(arcid, storageKeyPrefix || 'volatile://', {
      fileName: './serialized.manifest',
      pecFactories: [].concat([env.pecFactory], [portIndustry(bus)]),
      loader: runtime.loader,
      inspectorFactory: devtoolsArcInspectorFactory,
  });
  arc.pec.slotComposer.slotObserver = {
    observe: (content, arc) => {
      delete content.particle;
      bus.send({message: 'output', data: content});
    }
  };

  // optionally instantiate recipe
  if (action && await instantiateRecipe(arc, action)) {
    log(`successfully instantiated ${recipe} in ${arc}`);
  }
  return arc;
};

const instantiateRecipe = async (arc, recipe) => {
  const plan = await Utils.resolve(arc, recipe);
  if (!plan) {
    warn(`failed to resolve recipe ${recipe}`);
    return false;
  }
  if (RecipeUtil.matchesRecipe(arc.activeRecipe, plan)) {
    log(`recipe ${recipe} is already instantiated in ${arc}`);
    return false;
  }

  await arc.instantiate(plan);
  return true;
};
