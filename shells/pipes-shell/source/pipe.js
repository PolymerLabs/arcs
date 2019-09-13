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
import {Runtime} from '../../../build/runtime/runtime.js';
import {UiSlotComposer} from '../../../build/runtime/ui-slot-composer.js';
import {Utils} from '../../lib/utils.js';
import {requireContext} from './context.js';
import {dispatcher} from './dispatcher.js';
import {Bus} from './bus.js';
import {pec} from './verbs/pec.js';
import {spawn} from './verbs/spawn.js';
import {runArc} from './verbs/run-arc.js';

//const {log, warn} = logsFactory('pipe');

const manifest = `
import 'https://$particles/PipeApps/RenderNotification.arcs'
import 'https://$particles/PipeApps/Ingestion.arcs'
`;

export const initPipe = async (client, paths, storage, composerFactory) => {
  // configure arcs environment
  const env = Utils.init(paths.root, paths.map);
  // marshal context
  const context = await requireContext(manifest);
  // marshal dispatcher
  populateDispatcher(dispatcher, composerFactory, storage, context, env);
  // create bus
  const bus = new Bus(dispatcher, client);
  // return bus
  return bus;
};

export const initArcs = async (storage, bus) => {
  const context = await requireContext(manifest);
  // This must happen after `initPipe` returned, and `window.ShellApi` was initialized.
  // send pipe identifiers to client
  identifyPipe(context, bus);
};

const identifyPipe = async (context, bus) => {
  const recipes = context.allRecipes.map(r => r.name);
  bus.send({message: 'ready', recipes});
};

const populateDispatcher = (dispatcher, composerFactory, storage, context, env) => {
  const runtime = new Runtime(env.loader, UiSlotComposer, context);
  Object.assign(dispatcher, {
    pec: async (msg, tid, bus) => {
      return await pec(msg, tid, bus);
    },
    spawn: async (msg, tid, bus) => {
      return await spawn(msg, tid, bus, composerFactory, storage, context);
    },
    // TODO: eventually this should replace `spawn`. currently adding a parallel
    // API call, to not affect existing demos.
    runArc: async (msg, tid, bus) => {
      return await runArc(msg, tid, bus, runtime, env);
    }
  });
  return dispatcher;
};
