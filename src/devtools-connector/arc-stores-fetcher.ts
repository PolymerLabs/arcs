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
import {SingletonStorageProvider, CollectionStorageProvider} from '../runtime/storage/storage-provider-base.js';
import {Type} from '../runtime/type.js';
import {StorageKey} from '../runtime/storageNG/storage-key.js';
import {Store} from '../runtime/storageNG/store.js';
import {UnifiedStore} from '../runtime/storageNG/unified-store.js';

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
    for (const store of this.arc._stores) {
      if (!this.watchedHandles.has(store.id)) {
        this.watchedHandles.add(store.id);
        (await store.activate()).on(async () => {
          this.arcDevtoolsChannel.send({
            messageType: 'store-value-changed',
            messageBody: {
              id: store.id.toString(),
              value: await this.dereference(store)
            }
          });
          return true;
        });
      }
    }
  }

  private async listStores() {
    const find = (manifest: Manifest): [UnifiedStore, string[]][] => {
      let tags = [...manifest.storeTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    return {
      arcStores: await this.digestStores([...this.arc.storeTags]),
      contextStores: await this.digestStores(find(this.arc.context))
    };
  }

  private async digestStores(stores: [UnifiedStore, string[] | Set<string>][]) {
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
  private async dereference(store: UnifiedStore): Promise<any> {
    // TODO(shanestephens): Replace this with handle-based reading
    if (store instanceof Store) {
      // tslint:disable-next-line: no-any
      const crdtData = await (await (store as Store<any>).activate()).serializeContents();
      if (crdtData.values) {
        if (Object.values(crdtData.values).length === 1) {
          // Single value, extract the value only (discard the version).
          return Object.values(crdtData.values)[0]['value'];
        }
      }
      return crdtData;
    }
    return `(don't know how to dereference)`;
  }
}
