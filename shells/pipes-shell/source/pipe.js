/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Runtime} from '../../../build/runtime/runtime.js';
import {pec} from './verbs/pec.js';
import {runArc} from './verbs/run-arc.js';
import {stopArc} from './verbs/stop-arc.js';
import {event} from './verbs/event.js';
import {parse} from './verbs/parse.js';
import {dispatcher} from './dispatcher.js';
import {serializeVerb} from './serialize-verb.js';

//import {logsFactory} from '../../../build/platform/logs-factory.js';
//const {log} = logsFactory('pipe');

// Runtime is a Highlander.
// A new one is created on calls to `configureRuntime`,
// old ones are discarded.
let runtime;

// after busReady, the bus is listening but only has a handler for 'configure' verb
// when the 'configure' verb is invoked, other 'verb' handlers are configured
// bus endpoint is notified of busReady via 'ready' message (first handshake)
// bus endpoint is also notified about recipes via 'context' after 'configure'
// (second handshake)
export const busReady = async (bus, {manifest}) => {
  // setup `configure` verb-handler
  bus.dispatcher.configure = async ({config}, bus) => {
    // TODO(sjmiles): config.manifest: allow configuring mainfest via runtime argument for back-compat (deprecated)
    config.manifest = manifest || config.manifest;
    // other verbs are setup here
    return configureRuntime(config, bus);
  };
  // send `ready` message
  bus.send({message: 'ready'});
};

const configureRuntime = async ({rootPath, urlMap, storage, manifest}, bus) => {
  // configure arcs runtime environment
  runtime = new Runtime({rootPath, urlMap});
  // marshal context
  runtime.context = await requireContext(manifest);
  // attach verb-handlers to dispatcher
  populateDispatcher(dispatcher, storage, runtime.context);
  // send pipe identifiers to client
  contextReady(bus, runtime.context);
};

const requireContext = async manifest => {
  if (!requireContext.promise) {
    requireContext.promise = runtime.parse(manifest);
    window.context = await requireContext.promise;
  }
  return requireContext.promise;
};

const contextReady = async (bus, context) => {
  const recipes = context.allRecipes.map(r => ({name: r.name}));
  bus.send({message: 'context', recipes});
};

const populateDispatcher = (dispatcher, storage, context) => {
  storage = null;
  Object.assign(dispatcher, {
    pec: async (msg, bus) => {
      return pec(msg, bus);
    },
    runArc: async (msg, bus) => {
      const runArcTask = async () => runArc(msg, bus, runtime, storage);
      return serializeVerb('runArc', runArcTask);
    },
    uiEvent: async (msg, bus) => {
      return event(msg, runtime);
    },
    event: async (msg, bus) => {
      return event(msg, runtime);
    },
    stopArc: async (msg, bus) => {
      return stopArc(msg, runtime);
    },
    parse: async (msg, bus) => {
      return parse(runtime, msg, bus);
    }
  });
  return dispatcher;
};
