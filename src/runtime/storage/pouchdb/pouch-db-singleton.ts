/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PouchDB} from '../../../../concrete-storage/pouchdb.js';
import {assert} from '../../../platform/assert-web.js';
import {Type} from '../../type.js';
import {ChangeEvent, SingletonStorageProvider} from '../storage-provider-base.js';
import {SerializedModelEntry, ModelValue} from '../crdt-collection-model.js';
import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';
import {PouchDbStorage} from './pouch-db-storage.js';
import {upsert, UpsertDoc, UpsertMutatorFn} from './pouch-db-upsert.js';


/**
 * A representation of a Singleton in Pouch storage.
 */
interface SingletonStorage extends UpsertDoc {
  value: ModelValue;

  /** ReferenceMode state for this data */
  referenceMode: boolean;

  /** Monotonically increasing version number */
  version: number;
}


/**
 * The PouchDB-based implementation of a Singleton.
 */
export class PouchDbSingleton extends PouchDbStorageProvider implements SingletonStorageProvider {
  private localKeyId = 0;

  /**
   * Create a new PouchDbSingleton.
   *
   * @param type the underlying type for this singleton.
   * @param storageEngine a reference back to the PouchDbStorage, used for baseStorageKey calls.
   * @param name appears unused.
   * @param id see base class.
   * @param key the storage key for this collection.
   */
  constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string, refMode: boolean) {
    super(type, storageEngine, name, id, key, refMode);
    this._version = 0;

    // See if the value has been set
    this.upsert(async doc => doc).then((doc) => {
      this.resolveInitialized();
      // value has been written
    }).catch((err) => {
      console.warn('Error init ' + this.storageKey, err);
      // TODO(lindner) error out the initialized Promise
      throw err;
    });
  }

  /** @inheritDoc */
  backingType(): Type {
    return this.type;
  }

  async clone(): Promise<PouchDbSingleton> {
    const singleton = new PouchDbSingleton(this.type, this.storageEngine, this.name, this.id, null, this.referenceMode);
    await singleton.cloneFrom(this);
    return singleton;
  }

  async cloneFrom(handle): Promise<void> {
    const literal = await handle.serializeContents();
    await this.initialized;
    this.referenceMode = handle.referenceMode;

    if (handle.referenceMode && literal.model.length > 0) {
      // cloneFrom the backing store data by reading the model and writing it out.
      const [backingStore, handleBackingStore] = await Promise.all(
        [this.ensureBackingStore(), handle.ensureBackingStore()]);

      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: backingStore.storageKey}}));
      const underlying = await handleBackingStore.getMultiple(literal.model.map(({id}) => id));
      await backingStore.storeMultiple(underlying, [this.storageKey]);
    }

    await this.fromLiteral(literal);

    if (literal && literal.model && literal.model.length === 1) {
      const newvalue = literal.model[0].value;
      if (newvalue) {
        await this.upsert(async doc => {
          doc.value = newvalue;
          doc.referenceMode = this.referenceMode;
          doc.version = Math.max(this._version, doc.version) + 1;
          return doc;
        });
      }

      await this._fire(new ChangeEvent({data: newvalue, version: this._version}));
    }
  }

  /**
   * Returns the model data in a format suitable for transport over
   * the API channel (i.e. between execution host and context).
   */
  async modelForSynchronization() {
    await this.initialized;
    const doc = await this.upsert(async doc => doc);
    const value = doc.value;

    if (this.referenceMode && value !== null) {
      const backingStore = await this.ensureBackingStore();
      const result = await backingStore.fetchAll(value.id);
      return {
        version: this._version,
        model: [{id: value.id, value: result}]
      };
    }

    return super.modelForSynchronization();
  }

  /**
   * Returns the state of this singleton based as an object of the form
   * {version, model: [{id, value}]}
   */
  async serializeContents(): Promise<{version: number; model: SerializedModelEntry[]}> {
    await this.initialized;

    const doc = await this.upsert(async doc => doc);
    const value = doc.value;

    let model: SerializedModelEntry[] = [];
    if (value != null) {
      model = [
        {
          id: value.id,
          keys: [],
          value
        }
      ];
    }
    return {
      version: this._version,
      model
    };
  }

  /**
   * Updates the internal state of this singleton with the supplied data.
   */
  async fromLiteral({version, model}): Promise<void> {
    await this.initialized;

    const value = model.length === 0 ? null : model[0].value;

    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);

    const newDoc = await this.upsert(async (doc) => {
      // modify document
      doc.value = value;
      doc.referenceMode = this.referenceMode;
      doc.version = Math.max(version, doc.version) + 1;
      return doc;
    });

    this._version = newDoc.version;
  }

  /**
   * @return a promise containing the singleton value or null if it does not exist.
   */
  async fetch(): Promise<ModelValue> {
    await this.initialized;

    try {
      const doc = await this.upsert(async doc => doc);
      let value = doc.value;
      if (value == null) {
        //console.warn('value is null and refmode=' + this.referenceMode);
      }
      if (this.referenceMode && value) {
        const backingStore = await this.ensureBackingStore();
        value = await backingStore.fetchAll(value.id);
      }
      // logging goes here

      return value;
    } catch (err) {
      // TODO(plindner): caught for compatibility: pouchdb layer can throw, firebase layer never does
      console.warn('PouchDbSingleton.get err=', err);
      return null;
    }
  }

  /**
   * Set the value for this singleton.
   * @param value the value we want to set.  If null remove the singleton from storage
   * @param originatorId TBD
   * @param barrier TBD
   */
  async set(value, originatorId: string = null, barrier: string|null = null): Promise<void> {
    assert(value !== undefined);

    let stored: SingletonStorage;
    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);
      const backingStore = await this.ensureBackingStore();

      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id.
      await backingStore.store(value, [this.storageKey + this.localKeyId++]);

      // Store the indirect pointer to the storageKey
      // Do this *after* the write to backing store, otherwise null responses could occur
      stored = await this.upsert(async doc => {
        doc.referenceMode = this.referenceMode;
        doc.version = this._version;
        doc.value = {id: value['id'], storageKey};
        return doc;
      });
    } else {
      // Update Pouch/_stored, If value is null delete key, otherwise store it.
      if (value == null) {
        try {
          const doc = await this.db.get(this.pouchDbKey.location);
          await this.db.remove(doc);
        } catch (err) {
          // Deleting an already deleted item is acceptable.
          if (err.name !== 'not_found') {
            console.warn('PouchDbSingleton.remove err=', err);
            throw err;
          }
        }
      } else {
        stored = await this.upsert(async doc => {
          doc.referenceMode = this.referenceMode;
          doc.version = this._version;
          doc.value = value;
          return doc;
        });
      }
    }
    this.bumpVersion();

    const data = this.referenceMode ? value : stored.value;
    await this._fire(new ChangeEvent({data, version: this._version, originatorId, barrier}));
  }

  /**
   * Clear a singleton from storage.
   * @param originatorId TBD
   * @param barrier TBD
   */
  async clear(originatorId: string = null, barrier: string = null): Promise<void> {
    await this.set(null, originatorId, barrier);
  }

  /**
   * Triggered when the storage key has been modified or deleted.
   */
  async onRemoteStateSynced(doc: PouchDB.Core.ExistingDocument<SingletonStorage>) {
    // TODO(lindner): reimplement as simple fires when we have replication working again
    // TODO(lindner): consider using doc._deleted to special case.
    const value = doc.value;

    // Store locally
    this.bumpVersion(doc.version);

    // Skip if value == null, which is what happens when docs are deleted..
    if (value) {
      await this.ensureBackingStore().then(async store => {
        const data = await store.fetchAll(value.id);
        if (!data) {
          // TODO(lindner): data referred to by this data is missing.
          console.log('PouchDbSingleton.onRemoteSynced: possible race condition for id=' + value.id);
          return;
        }
        await this._fire(new ChangeEvent({data, version: this._version}));
      });
    } else {
      if (value != null) {
        await this._fire(new ChangeEvent({data: value, version: this._version}));
      }
    }
  }

  /**
   * Get/Modify/Set the data stored for this singleton.
   */
  private async upsert(mutatorFn: UpsertMutatorFn<SingletonStorage>): Promise<SingletonStorage> {
    const defaultDoc: SingletonStorage = {
      value: null,
      version: 0,
      referenceMode: this.referenceMode
    };
    const doc = await upsert(this.db, this.pouchDbKey.location, mutatorFn, defaultDoc);

    // post process results from doc here.
    this.referenceMode = doc.referenceMode;
    this._version = doc.version;

    return doc;
  }
}
