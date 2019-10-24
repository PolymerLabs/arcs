/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/runtime/log-factory.js';
import {Runtime} from '../../../build/runtime/runtime.js';
import {UiSlotComposer} from '../../../build/runtime/ui-slot-composer.js';
import {Utils} from '../../lib/utils.js';
import {instantiateRecipeByName} from './lib/utils.js';
import {requireContext} from './context.js';
import {requireIngestionArc} from './ingestion-arc.js';
import {dispatcher} from './dispatcher.js';
import {Bus} from './bus.js';
import {pec} from './verbs/pec.js';
import {runArc, stopArc, uiEvent} from './verbs/run-arc.js';
import {event} from './verbs/event.js';
import {spawn} from './verbs/spawn.js';
import {ingest} from './verbs/ingest.js';

const {log} = logsFactory('pipe');

const manifest = `
import 'https://$particles/PipeApps/RenderNotification.arcs'
import 'https://$particles/PipeApps/AndroidAutofill.arcs'
// UIBroker/demo particles below here
import 'https://$particles/Pipes/Pipes.arcs'
import 'https://$particles/Restaurants/Restaurants.arcs'
import 'https://$particles/Notification/Notification.arcs'
`;

export const initPipe = async (client, paths, storage) => {
  // configure arcs environment
  const env = Utils.init(paths.root, paths.map);
  // marshal context
  const context = await requireContext(manifest);
  // marshal dispatcher
  populateDispatcher(dispatcher, storage, context, env);
  // create bus
  const bus = new Bus(dispatcher, client);
  // return bus
  return bus;
};

// TODO(sjmiles): must be called only after `window.ShellApi` is initialized
export const initArcs = async (storage, bus) => {
  // marshal ingestion arc
  // TODO(sjmiles): "live context" tool (for demos)
  await requireIngestionArc(storage, bus);
  // marshal context
  const context = await requireContext(manifest);
  // send pipe identifiers to client
  identifyPipe(context, bus);
};

const identifyPipe = async (context, bus) => {
  // TODO(sjmiles): Formalize the pipes API.
  const recipes = context.allRecipes.map(r => ({name: r.name, triggers: r.triggers}));
  bus.send({message: 'ready', recipes});
};

const populateDispatcher = (dispatcher, storage, context, env) => {
  const runtime = new Runtime(env.loader, UiSlotComposer, context);
  Object.assign(dispatcher, {
    pec: async (msg, tid, bus) => {
      return await pec(msg, tid, bus);
    },
    // TODO: consolidate runArc and uiEvent with spawn and event, as well as
    // use of runtime object and composerFactory, brokerFactory below.
    runArc: async (msg, tid, bus) => {
      return await runArc(msg, bus, runtime, env);
    },
    uiEvent: async (msg, tid, bus) => {
      return await uiEvent(msg, runtime);
    },
    stopArc: async (msg, tid, bus) => {
      return await stopArc(msg, runtime);
    },
    // TODO(sjmiles): below here are "live context" tools (remove when other context options are viable)
    ingest: async (msg, tid, bus) => {
      return await ingest(msg.entity, tid, bus);
    },
    spawn: async (msg, tid, bus) => {
      const arc = await spawn(msg, tid, bus, composerFactory, storage, context);
      return arc;
    },
    recipe: async (msg, tid, bus) => {
      const arc = await bus.getAsyncValue(msg.tid);
      if (arc) {
        return await instantiateRecipeByName(arc, msg.recipe);
      }
    },
    event: async (msg, tid, bus) => {
      return await event(msg, tid, bus);
    }
  });
  return dispatcher;
};

const composerFactory = (modality, bus, tid) => {
  const composer = new UiSlotComposer();
  // TODO(sjmiles): hack in transaction identity, make this cleaner
  composer.tid = tid;
  // TODO(sjmiles): slotObserver could be late attached or we could attach
  // a thunk that dispatches to an actual broker configured elsewhere.
  composer.slotObserver = brokerFactory(bus);
  return composer;
};

// `slot-composer` delegates ui work to a `ui-broker`
const brokerFactory = bus => {
  return {
    observe: async (output, arc) => {
      log('UiBroker received', output);
      const content = output;
      content.particle = {
        name: output.particle.name,
        id: String(output.particle.id)
      };
      const tid = await bus.recoverTransactionId(arc);
      if (!tid) {
        log(`couldn't match the arc to a tid, inner arc?`);
      }
      bus.send({message: 'slot', tid, content: output});
    },
    dispose: () => null
  };
};
