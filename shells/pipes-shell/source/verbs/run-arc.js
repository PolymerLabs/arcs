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
export const runArc = async (msg, bus, runtime, env) => {
  const {recipe, arcId, storageKeyPrefix, pecId, particleId, particleName, providedSlotId} = msg;
  const action = runtime.context.allRecipes.find(r => r.name === recipe);
  if (!arcId) {
    warn(`arcId must be provided.`);
    return null;
  }
  if (recipe && !action) {
    warn(`found no recipes matching [${recipe}]`);
    return null;
  }
  const arc = runtime.runArc(arcId, storageKeyPrefix || 'volatile://', {
      fileName: './serialized.manifest',
      pecFactories: [].concat([env.pecFactory], [portIndustry(bus, pecId)]),
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
  if (action && await instantiateRecipe(arc, action, particleId, particleName, providedSlotId)) {
    log(`successfully instantiated ${recipe} in ${arc}`);
  }
  return arc;
};

const instantiateRecipe = async (arc, recipe, particleId, particleName, providedSlotId) => {
  let plan = await Utils.resolve(arc, recipe);
  if (!plan) {
    warn(`failed to resolve recipe ${recipe}`);
    return false;
  }
  if (RecipeUtil.matchesRecipe(arc.activeRecipe, plan)) {
    log(`recipe ${recipe} is already instantiated in ${arc}`);
    return reinstantiateParticle(arc, particleId, particleName);
  }

  plan = updateParticleInPlan(plan, particleId, particleName, providedSlotId);
  if (!plan) {
    warn(`failed updating particle id '${particleId}', name ${particleName} in recipe ${recipe}`);
    return false;
  }

  await arc.instantiate(plan);
  return true;
};

const reinstantiateParticle = (arc, particleId, particleName) => {
  if (particleId) {
    const particle = arc.activeRecipe.particles.find(p => p.id === particleId);
    if (particle) {
      arc.reinstantiateParticle(particle);
      return true;
    }
    warn(`Particle ${particleName} (${particleId} is not found in the active recipe`);
  }
  return false;
};

const updateParticleInPlan = (plan, particleId, particleName, providedSlotId) => {
  if (!!particleId && !!particleName) {
    plan = plan.clone();
    const particle = plan.particles.find(p => p.name === particleName);
    if (!particle) {
      warn(`Cannot find particle ${particleName} in plan = ${plan.toString()}.`);
      return null;
    }
    particle.id = particleId;
    if (providedSlotId) {
      if (particle.getSlotConnections().length !== 1) {
        warn(`Unexpected ${particle.getSlotConnections().length} of consumed slots for particle ${particleName}.`);
        return;
      }
      const providedSlots = Object.values(particle.getSlotConnections()[0].providedSlots);
      if (providedSlots.length !== 1) {
        warn(`Unexpected ${providedSlots.length} of provided slots for particle ${particleName}.`);
      }
      providedSlots[0].id = providedSlotId;
    }
    if (!plan.normalize()) {
      warn(`cannot normalize after setting id ${particleId} for particle ${particleName}`);
      return null;
    }
    if (!plan.isResolved()) {
      warn(`unresolved plan after setting id ${particleId} for particle ${particleName}`);
      return null;
    }
  }
  return plan;
};

export const stopArc = async ({arcId}, runtime) => {
  runtime.stopArc(arcId);
};
