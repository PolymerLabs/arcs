/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/platform/logs-factory.js';
import {Runtime} from '../../../build/runtime/runtime.js';
import {UiSlotComposer} from '../../../build/runtime/ui-slot-composer.js';
import {pec} from './verbs/pec.js';
import {runArc, stopArc, uiEvent} from './verbs/run-arc.js';
import {event} from './verbs/event.js';
import {spawn} from './verbs/spawn.js';
import {ingest} from './verbs/ingest.js';
import {parse} from './verbs/parse.js';
import {instantiateRecipeByName} from './lib/utils.js';
import {requireContext} from './context.js';
import {dispatcher} from './dispatcher.js';
import {requireIngestionArc} from './ingestion-arc.js';

const {log} = logsFactory('pipe');

export const busReady = async (bus, {manifest}) => {
  bus.dispatcher.configure = async ({config}, tid, bus) => {
    // TODO(sjmiles): hack to allow configuring mainfest via runtime argument
    // for back-compat (deprecated)
    config.manifest = manifest || config.manifest;
    return await configureRuntime(config, bus);
  };
  bus.send({message: 'ready'});
};

const configureRuntime = async ({rootPath, urlMap, storage, manifest}, bus) => {
  // configure arcs runtime environment
  Runtime.init(rootPath, urlMap);
  // marshal and bind context
  const context = await requireContext(manifest || config.manifest);
  Runtime.getRuntime().bindContext(context);
  // attach verb-handlers to dispatcher
  populateDispatcher(dispatcher, storage, context);
  // send pipe identifiers to client
  contextReady(bus, context);
};

const contextReady = async (bus, context) => {
  // TODO(sjmiles): Formalize the pipes API.
  const recipes = context.allRecipes.map(r => ({name: r.name, triggers: r.triggers}));
  bus.send({message: 'context', recipes});
};

const populateDispatcher = (dispatcher, storage, context) => {
  const runtime = Runtime.getRuntime();
  Object.assign(dispatcher, {
    pec: async (msg, tid, bus) => {
      return await pec(msg, tid, bus);
    },
    // TODO: consolidate runArc and uiEvent with spawn and event, as well as
    // use of runtime object and composerFactory, brokerFactory below.
    runArc: async (msg, tid, bus) => {
      return await runArc(msg, bus, runtime, storage);
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
      return await spawn(msg, tid, bus, composerFactory, storage, context);
    },
    recipe: async (msg, tid, bus) => {
      const arc = await bus.getAsyncValue(msg.tid);
      if (arc) {
        return await instantiateRecipeByName(arc, msg.recipe);
      }
    },
    event: async (msg, tid, bus) => {
      return await event(msg, tid, bus);
    },
    parse: async (msg, tid, bus) => {
      return await parse(msg, tid, bus);
    },
    enableIngestion: async (msg, tid, bus) => {
      // TODO(sjmiles): "live context" tool (for demos)
      // marshal ingestion arc
      return await requireIngestionArc(storage, bus);
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
