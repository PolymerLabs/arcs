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
import {Manifest, StorageStub} from '../runtime/manifest.js';
import {StorageProviderBase, VariableStorageProvider, CollectionStorageProvider} from '../runtime/storage/storage-provider-base.js';
import {Type} from '../runtime/type.js';

type Result = {
  name: string,
  tags: string[],
  id: string,
  storage: string,
  type: Type,
  description: string,
  // tslint:disable-next-line: no-any
  value: any,
};

export class ArcStoresFetcher {
  private arc: Arc;
  
  constructor(arc: Arc, arcDevtoolsChannel: ArcDevtoolsChannel) {
    this.arc = arc;

    arcDevtoolsChannel.listen('fetch-stores', async () => arcDevtoolsChannel.send({
      messageType: 'fetch-stores-result',
      messageBody: await this._listStores()
    }));
  }

  async _listStores() {
    const find = (manifest: Manifest): [StorageProviderBase | StorageStub, string[]][] => {
      let tags = [...manifest.storeTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    return {
      arcStores: await this._digestStores([...this.arc.storeTags]),
      contextStores: await this._digestStores(find(this.arc.context))
    };
  }

  async _digestStores(stores: [StorageProviderBase | StorageStub, string[] | Set<string>][]) {
    const result: Result[] = [];
    for (const [store, tags] of stores) {
      // tslint:disable-next-line: no-any
      let value: any;
      if ((store as CollectionStorageProvider).toList) {
        value = await (store as CollectionStorageProvider).toList();
      } else if ((store as VariableStorageProvider).get) {
        value = await (store as VariableStorageProvider).get();
      } else {
        value = `(don't know how to dereference)`;
      }
      // TODO: Fix issues with WebRTC message splitting.
      if (JSON.stringify(value).length > 50000) {
        value = 'too large for WebRTC';
      }
      result.push({
        name: store.name,
        tags: tags ? [...tags] : [],
        id: store.id,
        storage: store.storageKey,
        type: store.type,
        description: store.description,
        value
      });
    }
    return result;
  }
}
