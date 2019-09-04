/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Sharing} from '../sharing.js';
import {generateId} from '../../../../modalities/dom/components/generate-id.js';

export const ingest = async (data) => {
  if (Sharing.ingestionStore) {
    data.jsonData = data.jsonData || '';
    // ensure there is a timestamp
    //data.timestamp = data.timestamp || Date.now();
    // ensure there is a source value
    data.source = data.source || 'com.unknown';
    // construct an Entity
    const entity = {
      id: generateId(),
      rawData: data
    };
    console.log('adding pipeEntity', entity);
    // add to pipeStore
    await Sharing.ingestionStore.store(entity, [generateId()]);
  }
};
