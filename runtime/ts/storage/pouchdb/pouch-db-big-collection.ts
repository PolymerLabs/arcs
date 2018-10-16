import {PouchDbStorageProvider} from './pouch-db-storage-provider';
import {assert} from '../../../../platform/assert-web.js';

// TODO(lindner): update to operate like the firebase version
export class PouchDbBigCollection extends PouchDbStorageProvider {
  constructor(type, storageEngine, name, id, key) {
    super(type, storageEngine, name, id, key);
  }

  backingType() {
    return this.type.primitiveType();
  }

  async get(id) {
    throw new Error('NotImplemented');
  }

  async store(value, keys, originatorId) {
    assert(keys != null && keys.length > 0, 'keys required');
    throw new Error('NotImplemented');
  }

  async remove(id, keys, originatorId) {
    throw new Error('NotImplemented');
  }

  toLiteral() {
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
