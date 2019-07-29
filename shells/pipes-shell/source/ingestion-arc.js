/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logFactory} from '../../../build/runtime/log-factory.js';
import {RamSlotComposer} from '../../lib/components/ram-slot-composer.js';
import {ArcHost} from '../../lib/components/arc-host.js';
import {portIndustry} from './pec-port.js';

const id = 'ingestion-arc';
const manifest = `import 'https://$particles/PipeApps/Ingestion.arcs'`;

const log = logFactory(id);

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
  const host = new ArcHost(null, storage, new RamSlotComposer(), [portIndustry(bus)]);
  return await host.spawn({id, manifest});
};
