import {assert} from '../../../platform/assert-web.js';
import {Type} from '../../type.js';
import {ChangeEvent, VariableStorageProvider} from '../storage-provider-base.js';

import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';
import {PouchDbStorage} from './pouch-db-storage.js';

/**
 * Loosely defines the value object stored.
 */
interface ValueStorage {
  /** The id of this Variable */
  id: string;
  /** A reference to another storage key, used for reference mode */
  storageKey?: string;
  /** The actual value of the data */
  rawData?: {};
}

/**
 *  Callback definition for mutating values
 */
interface ValueStorageMutator {
  (value: ValueStorage): ValueStorage;
}

/**
 * A type definition for PouchDB to allow for direct access
 * to stored top-level fields in a doc.
 */
interface VariableStorage {
  value: ValueStorage;
  version: number;
  /** ReferenceMode state for this data */
  referenceMode: boolean;
}

/**
 * The PouchDB-based implementation of a Variable.
 */
export class PouchDbVariable extends PouchDbStorageProvider implements VariableStorageProvider {
  private _stored: ValueStorage | null = null;
  private localKeyId = 0;

  constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, storageEngine, name, id, key);
    this.backingStore = null;

    // Insure that there's a value stored.
    this.db.get(this.pouchDbKey.location).catch((err) => {
      if (err.name === 'not_found') {
        this.db.put({
          _id: this.pouchDbKey.location,
          value: null,
          version: 0,
          referenceMode: this.referenceMode
        }).catch((e) => {console.log('error init', e);});
      }
    });
  }

  backingType(): Type {
    return this.type;
  }

  clone(): PouchDbVariable {
    const variable = new PouchDbVariable(this.type, this.storageEngine, this.name, this.id, null);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle): Promise<void> {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();

    if (this.referenceMode && literal.model.length > 0) {
      // cloneFrom the backing store data by reading the model and writing it out.
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);

      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }

    await this.fromLiteral(literal);

    if (literal && literal.model && literal.model.length === 1) {
      const newvalue = literal.model[0].value;
      if (newvalue) {
        await this.getStoredAndUpdate(stored => newvalue);
      }
      this._fire('change', new ChangeEvent({data: newvalue, version: this.version}));
    }
  }

  /**
   * Returns the model data in a format suitable for transport over
   * the API channel (i.e. between execution host and context).
   */
  async modelForSynchronization() {
    const value = await this.getStored();

    if (this.referenceMode && value !== null) {
      await this.ensureBackingStore();
      const result = await this.backingStore.get(value.id);
      return {
        version: this.version,
        model: [{id: value.id, value: result}]
      };
    }

    return super.modelForSynchronization();
  }

  /**
   * Returns the state of this variable based as an object of the form
   * {version, model: [{id, value}]}
   */
  async toLiteral(): Promise<{version: number; model: {}[]}> {
    const value = await this.getStored();

    let model = [];
    if (value != null) {
      model = [
        {
          id: value.id,
          value
        }
      ];
    }
    return {
      version: this.version,
      model
    };
  }

  /**
   * Updates the internal state of this variable with data and stores
   * the data in the underlying Pouch Database.
   */
  async fromLiteral({version, model}): Promise<void> {
    const value = model.length === 0 ? null : model[0].value;
    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);
    await this.getStoredAndUpdate(stored => {
      return value;
    });
    this.version = version;
  }

  /**
   * @return a promise containing the variable value or null if it does not exist.
   */
  async get(): Promise<ValueStorage> {
    try {
      const value = await this.getStored();

      if (this.referenceMode && value) {
        await this.ensureBackingStore();
        return await this.backingStore.get(value.id);
      }
      return value;
    } catch (err) {
      // TODO(plindner): caught for compatibility: pouchdb layer can throw, firebase layer never does
      console.warn('PouchDbVariable.get err=', err);
      return null;
    }
  }

  /**
   * Set the value for this variable.
   * @param value the value we want to set.  If null remove the variable from storage
   * @param originatorId TBD
   * @param barrier TBD
   */
  async set(value: {}, originatorId: string = null, barrier: string = null): Promise<void> {
    assert(value !== undefined);
    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);

      await this.ensureBackingStore();

      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id.
      await this.backingStore.store(value, [this.storageKey + this.localKeyId++]);

      // Store the indirect pointer to the storageKey
      // Do this *after* the write to backing store, otherwise null responses could occur
      await this.getStoredAndUpdate(stored => {
        return {id: value['id'], storageKey};
      });
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      // TODO(lindner): determine if this is really needed
      if (JSON.stringify(this._stored) === JSON.stringify(value) && barrier == null) {
        return;
      }

      // Update Pouch/_stored, If value is null delete key, otherwise store it.
      if (value == null) {
        try {
          const doc = await this.db.get(this.pouchDbKey.location);
          await this.db.remove(doc);
        } catch (err) {
          // Deleting an already deleted item is acceptable.
          if (err.name !== 'not_found') {
            console.warn('PouchDbVariable.remove err=', err);
            throw err;
          }
        }
      } else {
        await this.getStoredAndUpdate(stored => {
         return value as ValueStorage;
        });
      }
    }
    this.version++;

    const data = this.referenceMode ? value : this._stored;
    await this._fire('change', new ChangeEvent({data, version: this.version, originatorId, barrier}));
  }

  /**
   * Clear a variable from storage.
   * @param originatorId TBD
   * @param barrier TBD
   */
  async clear(originatorId: string = null, barrier: string = null): Promise<void> {
    await this.set(null, originatorId, barrier);
  }

  /**
   * Triggered when the storage key has been modified or deleted.
   */
  onRemoteStateSynced(doc: PouchDB.Core.ExistingDocument<VariableStorage>): void {
    // Same revs?  No changes, just return.
    if (doc._rev === this._rev) {
      return;
    }

    // This is null for deleted docs.
    // TODO(lindner): consider using doc._deleted to special case.
    const value = doc.value;

    // Store locally
    this._stored = value;
    this._rev = doc._rev;
    this.referenceMode = doc.referenceMode;
    this.bumpVersion(doc.version);

    // Skip if value == null, which is what happens when docs are deleted..
    if (this.referenceMode && value) {
      this.ensureBackingStore().then(async store => {
        const data = await store.get(value.id);
        if (!data) {
          // TODO(lindner): data referred to by this data is missing.
          console.log('PouchDbVariable.onRemoteSynced: possible race condition for id=' + value.id);
          return;
        }
        this._fire('change', new ChangeEvent({data, version: this.version}));
      });
    } else {
      if (value != null) {
        this._fire('change', new ChangeEvent({data: value, version: this.version}));
      }
    }
  }

  /**
   * Pouch stored version of _stored.  Requests the value from the
   * database.
   *
   *  - If the fetched revision does not match update the local variable.
   *  - If the value does not exist store a null value.
   * @throw on misc pouch errors.
   */
  private async getStored(): Promise<ValueStorage> {
    try {
      const result = await this.db.get(this.pouchDbKey.location);

      // compare revisions
      if (this._rev !== result._rev) {
        // remote revision is different, update local copy.
        this._stored = result.value;
        this._rev = result._rev;
        this.referenceMode = result.referenceMode;
        this.bumpVersion(result.version);
      }
    } catch (err) {
      if (err.name === 'not_found') {
        // If the item was removed from storage empty out our local storage and bump the version.
        this._stored = null;
        this._rev = undefined;
        this.version++;
      } else {
        console.warn('PouchDbVariable.getStored err=', err);
        throw err;
      }
    }
    return this._stored;
  }

  /**
   * Provides a way to apply changes to the stored value in a way that
   * will result in the stored value being written to the underlying
   * PouchDB.
   *
   * - A new entry is stored if it doesn't exists.
   * - If the existing entry is available it is fetched
   * - If revisions differ a new item is written.
   * - The storage is potentially mutated and written.
   *
   * @param variableStorageMutator allows for changing the variable.
   * @return the current value of _stored.
   */
  private async getStoredAndUpdate(variableStorageMutator: ValueStorageMutator): Promise<ValueStorage> {
    // Keep retrying the operation until it succeeds.
    while (1) {
      // TODO(lindner): add backoff and give up after a set period of time.
      let doc: PouchDB.Core.ExistingDocument<VariableStorage>;

      let notFound = false;
      try {
        doc = await this.db.get(this.pouchDbKey.location);
        // Check remote doc.
        // TODO(lindner): refactor with getStored above.
        if (this._rev !== doc._rev) {
          // remote revision is different, update local copy.
          this._stored = doc.value;
          this._rev = doc._rev;
          this.bumpVersion(doc.version);
        }
      } catch (err) {
        if (err.name !== 'not_found') {
          throw err;
        }
        notFound = true;
      }

      // Run the mutator on a copy of the existing model
      const newValue = variableStorageMutator({...this._stored});

      // Check if the mutator made any changes..
      // TODO(lindner): add a deep equals method for VariableStorage
      if (!notFound && JSON.stringify(this._stored) === JSON.stringify(newValue)) {
        // mutator didn't make any changes.
        return this._stored;
      }

      // Apply changes made by the mutator
      doc = {
        _id: this.pouchDbKey.location,
        _rev: this._rev,
        value: newValue,
        version: this.version,
        referenceMode: this.referenceMode
      };

      // Update on pouchdb
      try {
        const putResult = await this.db.put(doc);
        // success! update local with new stored value
        this._rev = putResult.rev;
        this._stored = newValue;

        return this._stored;
      } catch (err) {
        if (err.name === 'conflict') {
          // keep trying;
        } else {
          // failed to write new doc, give up.
          console.warn('PouchDbVariable.getStoredAndUpdate (err, doc)=', err, doc);
          throw err;
        }
      }
    } // end while (1)

    // can never get here..
    return null;
  }
}
