/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO(sjmiles): "live context" tools below included so "classic" ingestion demos
// continue to function. These methods are easily removed when the demos are no
// longer important.

import {logsFactory} from '../../../build/platform/logs-factory.js';
import {ArcHost} from '../../lib/components/arc-host.js';
import {portIndustry} from './pec-port.js';
import {Sharing} from './sharing.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';

const id = 'classic-ingestion-arc';
const manifest = `import 'https://$particles/Pipes/Ingestion.arcs'`;

const {log} = logsFactory(id);

export const requireIngestionArc = async (storage, bus) => {
  if (!requireIngestionArc.promise) {
    requireIngestionArc.promise = initIngestionArc(storage, bus);
  }
  return requireIngestionArc.promise;
};

const initIngestionArc = async (storage, bus) => {
  log('initIngestionArc');
  // TODO(sjmiles): use ArcHost because it supports serialization, this core support should be available
  // via something lower-level (Utils? other lib?)
  const host = new ArcHost(null, storage, new SlotComposer(), [portIndustry(bus)]);
  const arc = await host.spawn({id, manifest});
  await Sharing.init(arc);
  return arc;
};
