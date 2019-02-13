import {PouchDB} from '../../../platform/pouchdb-web.js';
import {Type} from '../../type.js';
import {StorageProviderBase} from '../storage-provider-base.js';

import {PouchDbCollection} from './pouch-db-collection.js';
import {PouchDbKey} from './pouch-db-key.js';
import {PouchDbStorage} from './pouch-db-storage.js';

/**
 * Base class for PouchDb related Storage classes
 * (PouchDbVariable/PouchDbCollection)
 */
export abstract class PouchDbStorageProvider extends StorageProviderBase {
  /** The Storage Engine instance we were initialized with */
  protected storageEngine: PouchDbStorage;

  // Manages backing store
  backingStore: PouchDbCollection | null = null;
  private pendingBackingStore: Promise<PouchDbCollection> | null = null;

  /** The PouchDbKey for this Collection */
  protected readonly pouchDbKey: PouchDbKey;
  /** The Pouch revision of the data we have stored locally */
  protected _rev: string | undefined;

  protected constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, name, id, key);
    this.storageEngine = storageEngine;
    this.pouchDbKey = new PouchDbKey(key);
  }

  // A consequence of awaiting this function is that this.backingStore
  // is guaranteed to exist once the await completes. This is because
  // if backingStore doesn't yet exist, the assignment in the then()
  // is guaranteed to execute before anything awaiting this function.
  async ensureBackingStore(): Promise<PouchDbCollection> {
    if (this.backingStore) {
      return this.backingStore;
    }
    if (!this.pendingBackingStore) {
      const key = this.storageEngine.baseStorageKey(this.backingType(), this.storageKey);
      this.pendingBackingStore = this.storageEngine.baseStorageFor(this.type, key);
      this.pendingBackingStore.then(backingStore => (this.backingStore = backingStore));
    }
    return this.pendingBackingStore;
  }

  /**
   * The underlying type for the data.
   */
  abstract backingType(): Type;

  /**
   * The active database for this provider.
   */
  protected get db(): PouchDB.Database {
    return this.storageEngine.dbForKey(this.pouchDbKey);
  }

  /**
   * Called when the remote pouchdb server updates locally.
   */
  public abstract onRemoteStateSynced(doc: PouchDB.Core.ExistingDocument<{}>): void;

  /**
   * Increments the local version to be one more than the maximum of
   * the local and remove versions.
   */
  public bumpVersion(otherVersion: number): void {
    this.version = Math.max(this.version, otherVersion) + 1;
  }
}
