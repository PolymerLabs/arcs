/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../runtime/arc.js';
import {ArcDevtoolsChannel} from './abstract-devtools-channel.js';
import {Manifest} from '../runtime/manifest.js';
import {Type} from '../types/lib-types.js';
import {StorageKey} from '../runtime/storage/storage-key.js';
import {Store} from '../runtime/storage/store.js';
import {CRDTTypeRecord} from '../crdt/internal/crdt.js';

type Result = {
  name: string,
  tags: string[],
  id: string,
  storage: string | StorageKey,
  type: Type,
  description: string,
  // tslint:disable-next-line: no-any
  value: any,
};

export class ArcStoresFetcher {
  private arc: Arc;
  private arcDevtoolsChannel: ArcDevtoolsChannel;
  private watchedHandles: Set<string> = new Set();

  constructor(arc: Arc, arcDevtoolsChannel: ArcDevtoolsChannel) {
    this.arc = arc;
    this.arcDevtoolsChannel = arcDevtoolsChannel;

    arcDevtoolsChannel.listen('fetch-stores', async () => arcDevtoolsChannel.send({
      messageType: 'fetch-stores-result',
      messageBody: await this.listStores()
    }));
  }

  async onRecipeInstantiated() {
    for (const store of this.arc.stores) {
      if (!this.watchedHandles.has(store.id)) {
        this.watchedHandles.add(store.id);
        const theStore = await this.arc.getActiveStore(store);
        (await theStore.activate()).on(async () => {
          this.arcDevtoolsChannel.send({
            messageType: 'store-value-changed',
            messageBody: {
              id: store.id.toString(),
              value: await this.dereference(theStore)
            }
          });
        });
      }
    }
  }

  private async listStores() {
    const findArcStores = (arc: Arc): [Store<CRDTTypeRecord>, Set<string>][] => {
      return Object.entries(arc.storeTagsById).map(([storeId, tags]) => ([arc.findActiveStoreById(storeId), tags]));
    };
    const findManifestStores = (manifest: Manifest): [Store<CRDTTypeRecord>, Set<string>][] => {
      const storeTags: [Store<CRDTTypeRecord>, Set<string>][] = Object.entries(manifest.storeTagsById)
          .map(([storeId, tags]) => ([manifest.findActiveStoreById(storeId), tags]));
      if (manifest.imports) {
        manifest.imports.forEach(imp => storeTags.push(...findManifestStores(imp)));
      }
      return storeTags;
    };
    return {
      arcStores: await this.digestStores(findArcStores(this.arc)),
      contextStores: await this.digestStores(findManifestStores(this.arc.context))
    };
  }

  private async digestStores(stores: [Store<CRDTTypeRecord>, Set<string>][]) {
    const result: Result[] = [];
    for (const [store, tags] of stores) {
      result.push({
        name: store.name,
        tags: tags ? [...tags] : [],
        id: store.id,
        storage: store.storageKey,
        type: store.type,
        description: store.description,
        value: await this.dereference(store)
      });
    }
    return result;
  }

  // tslint:disable-next-line: no-any
  private async dereference(store: Store<CRDTTypeRecord>): Promise<any> {
    // TODO(shanestephens): Replace this with handle-based reading
    if (store instanceof Store) {
      const crdtData = await (await store.activate()).serializeContents();
      // tslint:disable-next-line: no-any
      const values = (crdtData as any).values;
      if (values) {
        if (Object.values(values).length === 1) {
          // Single value, extract the value only (discard the version).
          return Object.values(values)[0]['value'];
        }
      }
      return crdtData;
    }
    return `(don't know how to dereference)`;
  }
}
