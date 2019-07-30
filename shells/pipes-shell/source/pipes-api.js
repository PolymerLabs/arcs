/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {generateId} from '../../../modalities/dom/components/generate-id.js';
import {storeByTag} from './lib/utils.js';
import {initPipeStore, mirrorStore} from './context.js';
import {requireIngestionArc} from './ingestion-arc.js';

let ingestionArc;

export const marshalIngestionArc = async (storage, context, bus) => {
  // canonical arc to ingest input.
  ingestionArc = await requireIngestionArc(storage, bus);
};
