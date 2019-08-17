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
import {Utils} from '../../../lib/runtime/utils.js';
import {recipeByName, marshalOutput} from '../lib/utils.js';
import {logsFactory} from '../../../../build/runtime/log-factory.js';
import {ModalityHandler} from '../../../../build/runtime/modality-handler.js';
import {SlotConsumer} from '../../../../build/runtime/slot-consumer.js';
import {Stores} from '../../../lib/runtime/stores.js';
import {Schemas} from '../schemas.js';
import {portIndustry} from '../pec-port.js';

const {warn} = logsFactory('pipe');

export const spawn = async ({modality, recipe}, tid, bus, composerFactory, storage, context) => {
  const action = context.allRecipes.find(r => r.name === recipe);
  if (recipe && !action) {
    warn(`found no recipes matching [${recipe}]`);
    return null;
  } else {
    const modalityHandler = new ModalityHandler(class extends SlotConsumer {
      setContent(content, handler) {
        // Temporarily using transaction ID as slot ID.
        // TODO: Replace by slot-providing-particle.
        bus.send({message: 'output', slotid: '' + tid /*this.consumeConn.targetSlot.id*/, content});
      }
    });
    // instantiate arc
    const arc = await Utils.spawn({
      context,
      //storage,
      id: generateId(),
      composer: composerFactory(modality, modalityHandler),
      portFactories: [portIndustry(bus)]
    });
    // optionally instantiate recipe
    if (action) {
      await instantiateRecipe(arc, action);
    }
    return arc;
  }
};

const instantiateRecipe = async (arc, recipe) => {
  const plan = await Utils.resolve(arc, recipe);
  if (!plan) {
    warn('failed to resolve recipe');
    return false;
  }
  await arc.instantiate(plan);
  return true;
};
