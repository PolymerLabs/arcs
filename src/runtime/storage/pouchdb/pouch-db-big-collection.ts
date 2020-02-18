/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {BigCollectionStorageProvider} from '../storage-provider-base.js';
import {SerializedModelEntry} from '../crdt-collection-model.js';

import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';

// TODO(lindner): update to operate like the firebase version
export class PouchDbBigCollection extends PouchDbStorageProvider implements BigCollectionStorageProvider {
  constructor(type, storageEngine, name, id, key, refMode?: boolean) {
    super(type, storageEngine, name, id, key, refMode);
  }

  backingType() {
    return this.type.getContainedType();
  }

  async fetchAll(id: string) {
    throw new Error('NotImplemented');
  }

  async store(value, keys: string[], originatorId?: string) {
    assert(keys != null && keys.length > 0, 'keys required');
    throw new Error('NotImplemented');
  }

  async remove(id: string, keys: string[], originatorId?: string) {
    throw new Error('NotImplemented');
  }
  async stream(pageSize: number, forward = true): Promise<number> {
    throw new Error('NotImplemented');
  }
  async cursorNext(cursorId: number) {
    throw new Error('NotImplemented');
  }
  async cursorClose(cursorId: number): Promise<void> {
    throw new Error('NotImplemented');
  }
  cursorVersion(cursorId: number) {
    throw new Error('NotImplemented');
  }

  async serializeContents(): Promise<{version: number, model: SerializedModelEntry[]}> {
    throw new Error('NotImplemented');
  }

  async cloneFrom(): Promise<void> {
    throw new Error('NotImplemented');
  }

  clearItemsForTesting(): void {
    throw new Error('NotImplemented');
  }

  /**
   * Triggered when the storage key has been modified.  For now we
   * just refetch.  This is fast since the data is synced locally.
   */
  onRemoteStateSynced(doc) {
    throw new Error('NotImplemented');
  }
}
