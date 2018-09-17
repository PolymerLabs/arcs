import {StorageProviderBase} from "../storage-provider-base.js";

import {PouchDbCollection} from "./pouch-db-collection.js";
import {PouchDbStorage} from "./pouch-db-storage.js";
import {Type} from "../../type.js";

/**
 * Base class for PouchDb related Storage classes
 * (PouchDbVariable/PouchDbCollection)
 */
export abstract class PouchDbStorageProvider extends StorageProviderBase {
  protected backingStore: PouchDbCollection|null = null;
  protected storageEngine: PouchDbStorage;
  private pendingBackingStore: Promise<PouchDbCollection>|null = null;

  // A consequence of awaiting this function is that this.backingStore
  // is guaranteed to exist once the await completes. This is because
  // if backingStore doesn't yet exist, the assignment in the then()
  // is guaranteed to execute before anything awaiting this function.
  async ensureBackingStore() {
    if (this.backingStore) {
      return this.backingStore;
    }
    if (!this.pendingBackingStore) {
      const key = this.storageEngine.baseStorageKey(this.backingType());
      this.pendingBackingStore = this.storageEngine.baseStorageFor(this.type, key);
      this.pendingBackingStore.then(backingStore => this.backingStore = backingStore);
    }
    return this.pendingBackingStore;
  }

  abstract backingType(): Type;

  /**
   * The active database for this provider.
   */
  protected get db(): PouchDB.Database {
    return this.storageEngine.db;
  }

  protected async retryIt(doc): Promise<PouchDB.Core.Response> {
    let result = null;
    while (!result) {
      // Check for existing doc
      try {
        // Assume new data.
        result = await this.db.put(doc);
      } catch (err) {
        if (err.name === 'conflict') {
          // Look up original doc and merge.
          try {
            const origDoc = await this.db.get(doc._id);
            doc._rev = origDoc._rev;
          } catch (err) {
            console.log('UHOH', err);
            delete doc._rev;
            if (err.name !== 'not_found') {
              throw err;
            }
          }
          // TODO merge keys?
          console.log("Updating existing doc with rev=" + doc._rev);
        } else {
          console.log("Retrying error ", err);
          throw err;
        }
      }
    }
    return result;
  }
}
