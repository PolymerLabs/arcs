import {assert} from '../../../platform/assert-web.js';
import {BigCollectionStorageProvider} from '../storage-provider-base.js';

import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';

// TODO(lindner): update to operate like the firebase version
export class PouchDbBigCollection extends PouchDbStorageProvider implements BigCollectionStorageProvider {
  constructor(type, storageEngine, name, id, key) {
    super(type, storageEngine, name, id, key);
  }

  backingType() {
    return this.type.getContainedType();
  }

  async get(id: string) {
    throw new Error('NotImplemented');
  }

  async store(value, keys: string[], originatorId?: string) {
    assert(keys != null && keys.length > 0, 'keys required');
    throw new Error('NotImplemented');
  }

  async remove(id: string, keys: string[], originatorId?: string) {
    throw new Error('NotImplemented');
  }
  async stream(pageSize: number, forward = true) {
    throw new Error('NotImplemented');
  }
  async cursorNext(cursorId: number) {
    throw new Error('NotImplemented');
  }
  cursorClose(cursorId: number) {
    throw new Error('NotImplemented');
  }
  cursorVersion(cursorId: number) {
    throw new Error('NotImplemented');
  }

  toLiteral() {
    throw new Error('NotImplemented');
  }

  cloneFrom(): Promise<void> {
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
