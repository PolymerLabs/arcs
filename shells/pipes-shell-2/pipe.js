/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// dependencies
import {logsFactory} from '../../build/runtime/log-factory.js';
import {Utils} from '../lib/runtime/utils.js';
import {requireContext} from './context.js';
import {marshalPipesArc, addPipeEntity} from './api/pipes-api.js';
import {marshalArc, installPlanner, deliverSuggestions, ingestEntity, ingestRecipe, ingestSuggestion, observeOutput} from './api/spawn-api.js';
import {dispatcher} from './dispatcher.js';
import {Bus} from './bus.js';
import {portIndustry, handlePecMessage} from './pec-port.js';
import {initPlanner} from './planner.js';
import {autofill} from './api/autofill.js';
import {caption} from './api/caption.js';
import {Services} from '../../build/runtime/services.js';

const {log, warn} = logsFactory('pipe');

export const initPipe = async (client, paths, storage, composerFactory) => {
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // marshal context
  const context = await requireContext();
  // marshal pipes-arc (and stores)
  await marshalPipesArc(storage, context);
  // marshal planner
  initPlanner(context);
  // marshal api
  const api = constructApi(storage, context, composerFactory);
  // marshal dispatcher
  populateDispatcher(dispatcher, api, composerFactory, storage, context);
  // create bus
  const bus = new Bus(dispatcher, client);
  // send pipe identifiers to client
  identifyPipe(context, bus);
  // return device-side api object (bus + extras)
  return extendBus(bus);
};

const extendBus = bus => {
  // TODO(sjmiles): IIUC, Java is marshaling JS service objects to provide here.
  // I think I would have tried to make JS service wrappers that use the
  // bus to communicate with Java, but it seems a lot simpler for the Java side
  // to own all of it.
  bus.registerService = (name, service) => {
    console.log(`register (${name})`);
    Services.register(name, service);
  };

  return bus;
};

const identifyPipe = async (context, bus) => {
  const recipes = context.allRecipes.map(r => r.name);
  bus.send({message: 'ready', recipes});
};

const populateDispatcher = (dispatcher, api, composerFactory, storage, context) => {
  // populate dispatcher
  Object.assign(dispatcher, {
    capture: async (msg, tid, bus) => {
      return await addPipeEntity(msg.entity);
    },
    autofill: async (msg, tid, bus) => {
      return await autofill(msg, tid, bus, composerFactory, storage, context, [portIndustry(bus)]);
    },
    caption: async (msg, tid, bus) => {
      return await caption(msg, tid, bus, composerFactory, storage, context);
    },
    ingest: async (msg, tid, bus) => {
      if (msg.tid) {
        const arc = await bus.getAsyncValue(msg.tid);
        //log('found arc for ingestion', arc);
        if (arc) {
          if (msg.entity) {
            return ingestEntity(arc, msg.entity);
          } else if (msg.recipe) {
            return ingestRecipe(arc, msg.recipe);
          } else if (msg.suggestion) {
            return ingestSuggestion(arc, msg.suggestion);
          }
        } else {
          warn('found no arc for ingest tid=', msg.tid);
        }
      }
      else {
        return api.marshalProcessArc(msg, tid, bus);
      }
    },
    spawn: async (msg, tid, bus) => {
      return api.marshalSpawnArc(msg, tid, bus);
    },
    pec: async (msg, tid, bus) => {
      handlePecMessage(msg, tid, bus);
    }
  });
  return dispatcher;
};

const constructApi = (storage, context, composerFactory) => {
  return {
    // async addPipeEntity(entity) {
    //   return await addPipeEntity(entity);
    // },
    async marshalProcessArc(msg, tid, bus) {
      const composer = composerFactory(msg.modality);
      const arc = await marshalArc(tid, composer, context, storage, bus);
      await ingestAndObserve(msg, tid, bus, arc);
      //log('marshalProcessArc:', arc);
      return arc;
    },
    async marshalSpawnArc(msg, tid, bus) {
      const composer = composerFactory(msg.modality);
      const arc = await marshalArc(tid, composer, context, storage, bus);
      installPlanner(tid, bus, arc, suggestions => deliverSuggestions(tid, bus, suggestions));
      // create a handle to use as an output slot, forward handle changes to the bus
      observeOutput(tid, bus, arc);
      //log('marshalSpawnArc:', arc);
      return arc;
    }
  };
};

const ingestAndObserve = async (msg, tid, bus, arc) => {
  let onSuggestions;
  if (msg.entity) {
    await ingestEntity(arc, msg.entity);
    onSuggestions = consumeOneSuggestionCallbackFactory(tid, bus, arc);
  }
  else if (msg.recipe) {
    await ingestRecipe(arc, msg.recipe);
    // create a handle to use as an output slot, forward handle changes to the bus
    observeOutput(tid, bus, arc);
    onSuggestions = suggestionCallbackFactory(tid, bus);
  }
  if (onSuggestions) {
    await installPlanner(tid, bus, arc, onSuggestions);
  }
};

// TODO(sjmiles): a lot of jumping-about for two stage suggestion handling, simplify
const consumeOneSuggestionCallbackFactory = (tid, bus, arc) => {
  let didOne;
  return suggestions => {
    if (!didOne) {
      didOne = true;
      const suggestion = suggestions[0];
      if (suggestion) {
        // simulate receiving a message to instantiate this suggestion (weird?)
        bus.receive({message: 'ingest', tid, suggestion: suggestion.descriptionText});
        // forward output to the bus
        observeOutput(tid, bus, arc);
      }
    } else {
      deliverSuggestions(tid, bus, suggestions);
    }
  };
};

const suggestionCallbackFactory = (tid, bus) => {
  return suggestions => deliverSuggestions(tid, bus, suggestions);
};
