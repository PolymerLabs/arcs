/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

//import {logsFactory} from '../../../build/runtime/log-factory.js';
import {Utils} from '../../lib/runtime/utils.js';
import {requireContext} from './context.js';
import {marshalIngestionArc} from './pipes-api.js';
import {dispatcher} from './dispatcher.js';
import {Bus} from './bus.js';
import {pec} from './verbs/pec.js';
import {spawn} from './verbs/spawn.js';

//const {log, warn} = logsFactory('pipe');

export const initPipe = async (client, paths, storage, composerFactory) => {
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // marshal context
  const context = await requireContext();
  // marshal dispatcher
  populateDispatcher(dispatcher, composerFactory, storage, context);
  // create bus
  const bus = new Bus(dispatcher, client);
  // marshal pipes-arc (and stores)
  await marshalIngestionArc(storage, context, bus);
  // send pipe identifiers to client
  identifyPipe(context, bus);
  // return bus
  return bus;
};

const identifyPipe = async (context, bus) => {
  const recipes = context.allRecipes.map(r => r.name);
  bus.send({message: 'ready', recipes});
};

const populateDispatcher = (dispatcher, composerFactory, storage, context) => {
  Object.assign(dispatcher, {
    pec: async (msg, tid, bus) => {
      return await pec(msg, tid, bus);
    },
    spawn: async (msg, tid, bus) => {
      return await spawn(msg, tid, bus, composerFactory, storage, context);
    }
  });
  return dispatcher;
};
