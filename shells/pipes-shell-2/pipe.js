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

const {log, warn} = logsFactory('pipe');

export const initPipe = async (client, paths, storage, composerFactory) => {
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // marshal context
  const context = await requireContext();
  // marshal pipes-arc (and stores)
  await marshalPipesArc(storage, context);
  // construct ShellApi
  const api = {
    addPipeEntity(entity) {
      return addPipeEntity(entity);
    },
    async marshalProcessArc(msg, tid, bus) {
      const composer = composerFactory(msg.modality);
      const arc = await marshalArc(tid, composer, context, storage, bus);
      const callback = await ingestAndObserve(msg, tid, bus, arc);
      installPlanner(tid, bus, arc, callback);
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
  // populate dispatcher
  Object.assign(dispatcher, {
    capture: async (msg, tid, bus) => {
      return addPipeEntity(msg.entity);
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
    }
  });
  // create bus
  return new Bus(dispatcher, client);
};

const ingestAndObserve = async (msg, tid, bus, arc) => {
  if (msg.entity) {
    await ingestEntity(arc, msg.entity);
    return consumeOneSuggestionCallbackFactory(tid, bus, arc);
  } else if (msg.recipe) {
    await ingestRecipe(arc, msg.recipe);
    // create a handle to use as an output slot, forward handle changes to the bus
    observeOutput(tid, bus, arc);
    return suggestionCallbackFactory(tid, bus);
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
