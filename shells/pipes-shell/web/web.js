/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// configure
import '../../lib/platform/loglevel-web.js';
import {version, paths, storage, test} from './config.js';

// optional
//import '../../lib/database/pouchdb-support.js';
//import '../../lib/database/firebase-support.js';
//import '../../configuration/whitelisted.js';
import {DevtoolsSupport} from '../../lib/runtime/devtools-support.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';

// dependencies
import {DomSlotComposer} from '../../lib/components/dom-slot-composer.js';
import {RamSlotComposer} from '../../lib/components/ram-slot-composer.js';
import {findContainers} from '../source/lib/utils.js';
import {initPipe, initArcs} from '../source/pipe.js';
import {smokeTest} from '../source/smoke.js';

console.log(`${version} -- ${storage}`);

const composerFactory = (modality, modalityHandler) => {
  switch (modality) {
    case 'dom': {
      const node = document.body.appendChild(document.createElement('div'));
      node.style = 'margin-bottom: 8px;';
      node.innerHTML = '<div slotid="root"></div>';
      return new DomSlotComposer({containers: findContainers(node)});
    }
    // TODO: temporarily using 'voice' modality for pipes demo.
    // until #3480 is merged with support for arbitrary strings.
    case 'voice': {
      return new class extends SlotComposer {
        constructor(options) {
          super(Object.assign({
            modalityName: modality,
            modalityHandler,
            containers: {'root': {}}
          }, options));
        }
      };
    }
    default:
      return new RamSlotComposer();
  }
};

const client = window.DeviceClient || {};

(async () => {
  // if remote DevTools are requested, wait for connect
  await DevtoolsSupport();
  // configure pipes and get a bus
  const bus = await initPipe(client, paths, storage, composerFactory);
  // export bus
  window.ShellApi = bus;
  // post startup shell initializations.
  await initArcs(storage, bus);
  // run smokeTest if requested
  if (test) {
    smokeTest(bus);
    // world's dumbest ui
    window.onclick = () => {
      bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'caption', name: 'Dogs are awesome'}});
    };
  }
})();
