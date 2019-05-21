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
import {PouchDB} from '../../../platform/pouchdb-web.js';
import {Type, TypeLiteral} from '../../type.js';
import {Mutex} from '../../mutex.js';
import {CrdtCollectionModel, SerializedModelEntry, ModelValue} from '../crdt-collection-model.js';
import {ChangeEvent, CollectionStorageProvider} from '../storage-provider-base.js';
import {UpsertDoc, UpsertMutatorFn, upsert} from './pouch-db-upsert.js';
import {PouchDbStorage} from './pouch-db-storage.js';
import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';


/**
 * A representation of a Collection in Pouch storage.
 */
interface CollectionStorage extends UpsertDoc {
  model: SerializedModelEntry[];
  version: number;
  referenceMode: boolean|null;
  type: TypeLiteral;
}

/**
 * The PouchDB-based implementation of a Collection.
 */
export class PouchDbCollection extends PouchDbStorageProvider implements CollectionStorageProvider {
  private upsertMutex = new Mutex();
  // A copy of the last document to be upserted, used in onRemoteStateSynced to
  // calculate the keys that were added/removed.
  private lastDocSeen: Readonly<CollectionStorage>;

  /**
   * Create a new PouchDbCollection.
   *
   * @param type the underlying type for this collection.
   * @param storageEngine a reference back to the PouchDbStorage, used for baseStorageKey calls.
   * @param name appears unused.
   * @param id see base class.
   * @param key the storage key for this collection.
   */
  constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string, refMode: boolean) {
    super(type, storageEngine, name, id, key, refMode);

    // Ensure that the underlying database and backing store is created.
    this.getModel().then(() => {
      this.resolveInitialized();
    }).catch((err) => {
      // should throw something?
      console.warn('error init', err);
    });

    assert(this.version !== null);
  }

  /** @inheritDoc */
  backingType() {
    return this.type.getContainedType();
  }

  // TODO(lindner): don't allow this to run on items with data...
  async cloneFrom(handle): Promise<void> {
    await this.initialized;

    this.referenceMode = handle.referenceMode;

    const literal = await handle.toLiteral();
    if (this.referenceMode && literal.model.length > 0) {
      const [backingStore, handleBackingStore] =
        await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: backingStore.storageKey}}));

      const underlying = await handleBackingStore.getMultiple(literal.model.map(({id}) => id));
      await backingStore.storeMultiple(underlying, [this.storageKey]);
    }

    const updatedCrdtModel = new CrdtCollectionModel(literal.model);

    const doc = await this.upsert(async doc => {
      doc.referenceMode = this.referenceMode;
      doc.model = updatedCrdtModel.toLiteral();
      doc.version = Math.max(this.version, doc.version) + 1;
      return doc;
    });

    // fire?
    const updatedCrdtModelLiteral = doc.model;
    const dataToFire = updatedCrdtModelLiteral.length === 0 ? null : updatedCrdtModelLiteral[0].value;

    this._fire('change', new ChangeEvent({data: dataToFire, version: this.version}));
  }

  /** @inheritDoc */
  async modelForSynchronization() {
    await this.initialized;
    // TODO(lindner): should this change for reference mode??
    const retval = {
      version: this.version,
      model: await this._toList()
    };
    return retval;
  }

  /** @inheritDoc */
  async toLiteral(): Promise<{version: number, model: SerializedModelEntry[]}> {
    await this.initialized;
    return {
      version: this.version,
      model: (await this.getModel()).toLiteral()
    };
  }

  private async _toList(): Promise<SerializedModelEntry[]> {
    await this.initialized;
    if (this.referenceMode) {
      const items = (await this.getModel()).toLiteral();
      if (items.length === 0) {
        return [];
      }
      const refSet = new Set();
      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1, `multiple storageKeys in reference set of collection not yet supported.`);
      const ref = refSet.values().next().value;

      const backingStore = await this.ensureBackingStore();

      // Get id strings and corresponding backingStore values
      const ids = items.map(item => item.value.id);
      const backingStoreValues = await backingStore.getMultiple(ids);

      // merge items/backingStoreValues into retval
      const retval: SerializedModelEntry[] = [];
      for (const item of items) {
        // backingStoreValues corresponds to each
        const backingStoreValue = backingStoreValues.shift();
        retval.push({id: item.value.id, value: backingStoreValue, keys: item.keys});
      }

      return retval;
    }
    // !this.referenceMode
    return (await this.getModel()).toLiteral();
  }

  async toList(): Promise<ModelValue[]> {
    await this.initialized;
    const retval = (await this._toList()).map(item => item.value);
    return retval;
  }

  /**
   * Returns an array of values for each of the specified ids.
   *
   * @param ids items to fetch from the underlying CRDT model.
   * @return an array of values from the underlying CRDT
   */
  async getMultiple(ids: string[]): Promise<ModelValue[]>  {
    await this.initialized;
    assert(!this.referenceMode, 'getMultiple not implemented for referenceMode stores for '+ this.storageKey);
    const model = await this.getModel();
    return ids.map(id => model.getValue(id));
  }

  /**
   * Store multiple values with the given keys in the Collection.
   * TODO(lindner): document originatorId, which is unused.
   */
  async storeMultiple(values, keys, originatorId = null): Promise<void> {
    await this.initialized;
    assert(!this.referenceMode, 'storeMultiple not implemented for referenceMode stores');

    await this.upsert(async doc => {
      const crdtmodel = new CrdtCollectionModel(doc.model);
      values.map(value => crdtmodel.add(value.id, value, keys));

      doc.model = crdtmodel.toLiteral();
      doc.version++;

      return doc;
    });
    // fire?
  }

  /**
   * Get a specific Id value previously set using store().
   *
   * @remarks Note that the id referred to here is not the same as
   * used in the constructor.
   */
  async get(id: string) {
    await this.initialized;
    if (this.referenceMode) {
      const ref = (await this.getModel()).getValue(id);
      // NOTE(wkorman): Firebase returns null if ref is null, but it's not clear
      // that we ever want to return a null value for a get, so for Pouch we
      // choose to assert instead at least for the time being.
      assert(ref !== null, `no reference for id [id=${id}, collection.id=${this.id}, storageKey=${this._storageKey}, referenceMode=${this.referenceMode}].`);
      const backingStore = await this.ensureBackingStore();
      const backedValue = await backingStore.get(ref.id);
      assert(backedValue !== null, `should never return a null entity value [ref.id=${ref.id}, collection.id=${this.id}, storageKey=${this._storageKey}, referenceMode=${this.referenceMode}].`);
      return backedValue;
    }

    const model = await this.getModel();
    const modelValue = model.getValue(id);
    assert(modelValue !== null, `should never return a null entity value [id=${id}, collection.id=${this.id}, storageKey=${this._storageKey}, referenceMode=${this.referenceMode}].`);
    return modelValue;
  }

  /**
   * Store the specific value to the collection.  Value must include an id entry.
   *
   * @param value A data object with an id entry that is used as a key.
   * @param keys The CRDT keys used to store this object
   * @param originatorId TBD passed to event listeners
   */
  async store(value, keys: string[], originatorId:string = undefined): Promise<void> {
    assert(keys != null && keys.length > 0, 'keys required');

    const id = value.id;

    // item contains data that is passed to _fire
    const item = {value, keys, effective: false};

    if (this.referenceMode) {
      const referredType = this.type.getContainedType();
      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);

      // Update the referred data
      await this.initialized;

      const backingStore = await this.ensureBackingStore();
      backingStore.store(value, keys);

      const doc = await this.upsert(async doc => {
        const crdtmodel = new CrdtCollectionModel(doc.model);
        item.effective = crdtmodel.add(value.id, {id: value.id, storageKey}, keys);
        doc.model = crdtmodel.toLiteral();
        return doc;
      });
    } else {
      await this.initialized;

      const doc = await this.upsert(async doc => {
        const crdtmodel = new CrdtCollectionModel(doc.model);
        item.effective = crdtmodel.add(value.id, value, keys);
        doc.model = crdtmodel.toLiteral();
        return doc;
      });
    }

    // Notify Listeners
    this._fire('change', new ChangeEvent({add: [item], version: this.version, originatorId}));
  }

  async removeMultiple(items, originatorId?: string): Promise<void> {
    await this.initialized;

    const doc = await this.upsert(async doc => {
      const crdtmodel = new CrdtCollectionModel(doc.model);

      // TODO(lindner): document this
      if (items.length === 0) {
        items = crdtmodel.toList().map(item => ({id: item.id, keys: []}));
      }
      items.forEach(item => {
        if (item.keys.length === 0) {
          item.keys = crdtmodel.getKeys(item.id);
        }
        item.value = crdtmodel.getValue(item.id);
        if (item.value !== null) {
          item.effective = crdtmodel.remove(item.id, item.keys);
        }
      });
      doc.model = crdtmodel.toLiteral();
      return doc;
    });

    this._fire('change', new ChangeEvent({remove: items, version: this.version, originatorId}));
  }

  /**
   * Remove ids from a collection for specific keys.
   * @param id the id to remove.
   * @param keys the CRDT specific keys to remove.
   * @param originatorId TBD passed to event listeners.
   */
  async remove(id: string, keys: string[] = [], originatorId?: string) {
    await this.initialized;
    const doc = await this.upsert(async doc => {
      const crdtmodel = new CrdtCollectionModel(doc.model);
      if (keys.length === 0) {
        keys = crdtmodel.getKeys(id);
      }
      const value = crdtmodel.getValue(id);

      if (value !== null) {
        const effective = crdtmodel.remove(id, keys);
        // TODO(lindner): isolate side effects...

        this._fire('change', new ChangeEvent({remove: [{value, keys, effective}], version: this.version, originatorId}));
      }
      doc.model = crdtmodel.toLiteral();
      return doc;
    });
  }

  /**
   * Triggered when the storage key has been modified outside of the local context.
   *
   * When called:
   * - Compares the last doc seen with the new doc.
   * - Finds keys that are added/removed, and fires events.
   */
  public async onRemoteStateSynced(newdoc: PouchDB.Core.ExistingDocument<CollectionStorage>) {
    console.log('HEY ', newdoc);
    // acquire the upsert lock because we are reading from the shared state.
    const release = await this.upsertMutex.acquire();


    try {
      // TODO(lindner) skip if no one's listening..
      if (!newdoc || !newdoc.model) {
        // corrupt data?  skip
      }

      if (this.referenceMode !== newdoc.referenceMode) {
        console.warn('Unsupported: switch from reference mode to non-reference mode');
        return;
      }

      let newModel: CrdtCollectionModel;
      let oldModel: CrdtCollectionModel;

      if (this.referenceMode) {
        const backingStore = await this.ensureBackingStore();
        // TODO(lindner): we need to keep the previous state.. somewhere.
        newModel = null;
        oldModel = null;
        return;
      }

      newModel = new CrdtCollectionModel(newdoc.model);

      // remote revision is different, update local copy.
      oldModel =  (this.lastDocSeen && this.lastDocSeen.model)
        ? new CrdtCollectionModel(this.lastDocSeen.model)
        : new CrdtCollectionModel();

      // Calculate added/removed keys from oldModel/newModel
      const added = [];
      const removed = [];

      for (const modelValue of oldModel.toList()) {
        if (!newModel.has(modelValue.id)) {
          const item = {value: oldModel.getValue(modelValue.id),
                        keys: oldModel.getKeys(modelValue.id), // TODO(???)
                        effective: true};

          removed.push(modelValue);
        }
      }

      for (const modelValue of newModel.toList()) {
        if (!oldModel.has(modelValue.id)) {
          const item = {value: newModel.getValue(modelValue.id),
                        keys: newModel.getKeys(modelValue.id),
                        effective: true};

          added.push(item);
        }
      }
       
      this.lastDocSeen = newdoc;
      this.version = newdoc.version;
      console.log('updating to version ' + newdoc.version);

      this._fire('change', new ChangeEvent({add: added, remove: removed, version: this.version}));
    } finally {
      release();
    }
  }

  /**
   * Gets the latest CrdtCollectionModel from storage.
   */
  private async getModel(): Promise<CrdtCollectionModel> {
    // simple update that sets defaults
    const doc = await this.upsert(async doc => doc);
    return new CrdtCollectionModel(doc.model);
  }

  /**
   * Get/Modify/Set the data stored for this collection.
   *
   * Also performs the following actions
   * - Acquires a mutex so upserts for this doc are serialized.
   * - Updates local state for version/referenceMode and the last doc seen.
   */
  private async upsert(mutatorFn: UpsertMutatorFn<CollectionStorage>): Promise<Readonly<CollectionStorage>> {
    const defaultDoc: CollectionStorage = {
      referenceMode: this.referenceMode,
      type: this.type.toLiteral(),
      model: new CrdtCollectionModel().toLiteral(),
      version: 0,
    };
    const release = await this.upsertMutex.acquire();
    try {
      // Update local state..
      const doc = await upsert(this.db, this.pouchDbKey.location, mutatorFn, defaultDoc);
      this.version = doc.version;
      this.referenceMode = doc.referenceMode;
      this.lastDocSeen = doc;
      return doc;
    } finally {
      release();
    }
  }

  /**
   * Remove this item from the database for testing purposes.
   */
  async clearItemsForTesting(): Promise<void> {
    await this.initialized;
    // Remove the Pouch Document
    // TODO(lindner): does this need to work with reference mode?
    try {
      const doc = await this.db.get(this.pouchDbKey.location);
      await this.db.remove(doc);
    } catch (err) {
      if (err.name !== 'not_found') {
        console.warn('clearItemsForTesting: error removing', err);
      }
    }
  }
}
