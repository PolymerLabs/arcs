/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/platform/logs-factory.js';
import {Runtime} from '../../../build/runtime/runtime.js';
import {pec} from './verbs/pec.js';
import {runArc} from './verbs/run-arc.js';
import {stopArc} from './verbs/stop-arc.js';
import {event} from './verbs/event.js';
import {parse} from './verbs/parse.js';
import {dispatcher} from './dispatcher.js';
import {serializeVerb} from './serialize-verb.js';

const {log} = logsFactory('pipe');

export const busReady = async (bus, {manifest}) => {
  bus.dispatcher.configure = async ({config}, bus) => {
    // TODO(sjmiles): config.manifest: allow configuring mainfest via runtime argument
    // for back-compat (deprecated)
    config.manifest = manifest || config.manifest;
    return configureRuntime(config, bus);
  };
  bus.send({message: 'ready'});
};

const configureRuntime = async ({rootPath, urlMap, storage, manifest}, bus) => {
  // configure arcs runtime environment
  Runtime.init(rootPath, urlMap);
  // marshal and bind context
  const context = await requireContext(manifest);
  Runtime.getRuntime().bindContext(context);
  // attach verb-handlers to dispatcher
  populateDispatcher(dispatcher, storage, context);
  // send pipe identifiers to client
  contextReady(bus, context);
};

const requireContext = async manifest => {
  if (!requireContext.promise) {
    requireContext.promise = Runtime.parse(manifest);
    window.context = await requireContext.promise;
  }
  return requireContext.promise;
};

const contextReady = async (bus, context) => {
  const recipes = context.allRecipes.map(r => ({name: r.name}));
  bus.send({message: 'context', recipes});
};

const populateDispatcher = (dispatcher, storage, context) => {
  // TODO(sjmiles): StorageNG: storage parameter must be a StorageKey object
  storage = null;
  const runtime = Runtime.getRuntime();
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
      return parse(msg, bus);
    }
  });
  return dispatcher;
};
