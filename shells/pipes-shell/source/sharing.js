/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {mirrorStore, requireContext} from './context.js';
import {Stores} from '../../lib/stores.js';
import {Schemas} from './schemas.js';

export const Sharing = {
  async init(ingestionArc) {
    Sharing.shareStore = await Sharing.initShareStore();
    ingestionArc.storeTags.forEach(async (tags, store) => {
      if (tags.has('incomingEntities')) {
        console.log('Found ingestion store', store.id);
        await Sharing.setIngestionStore(store);
      }
    });
  },
  async initShareStore() {
    const context = await requireContext();
    return await Stores.create(context, {
      name: 'pipe-entities',
      id: 'pipe-entities',
      schema: Schemas.IncomingEntity,
      isCollection: true,
      tags: null,
      storageKey: null
    });
  },
  async setIngestionStore(store) {
    Sharing.ingestionStore = store;
    await mirrorStore(Sharing.ingestionStore, Sharing.shareStore);
  }
};
