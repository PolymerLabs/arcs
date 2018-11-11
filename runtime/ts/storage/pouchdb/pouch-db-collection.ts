import {CrdtCollectionModel} from '../crdt-collection-model.js';
import {assert} from '../../../../platform/assert-web.js';
import {PouchDbStorageProvider} from './pouch-db-storage-provider.js';
import {Type} from '../../type.js';
import {PouchDbStorage} from './pouch-db-storage';
import PouchDB from 'pouchdb';

/**
 * Defines a callback interface to allow for modifying a
 * CrdtCollectionModel during a get/modify/set cycle.
 */

interface CrdtCollectionModelMutator {
  (crdt: CrdtCollectionModel): CrdtCollectionModel;
}

export class PouchDbCollection extends PouchDbStorageProvider {
  /** The local synced model */
  private _model: CrdtCollectionModel; // NOTE: Private, but outside code accesses this :(

  /**
   * Create a new PouchDbCollection.
   *
   * @param type the underlying type for this collection.
   * @param storageEngine a reference back to the PouchDbStorage, used for baseStorageKey calls.
   * @param name appears unused.
   * @param id see base class.
   * @param key the storage key for this collection.
   */
  constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, storageEngine, name, id, key);

    this._model = new CrdtCollectionModel();
    assert(this.version !== null);
  }

  /** @inheritDoc */
  backingType() {
    return this.type.primitiveType();
  }

  // TODO(lindner): write tests
  clone(): PouchDbCollection {
    const handle = new PouchDbCollection(this.type, this.storageEngine, this.name, this.id, null);
    handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle): Promise<void> {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    this.fromLiteral(literal);
  }

  /** @inheritDoc */
  async modelForSynchronization() {
    // TODO(lindner): should this change for reference mode??
    return {
      version: this.version,
      model: await this._toList()
    };
  }

  /** @inheritDoc */
  // Returns {version, model: [{id, value, keys: []}]}
  // TODO(lindner): this is async, but the base class isn't....
  async toLiteral() {
    return {
      version: this.version,
      model: (await this.getModel()).toLiteral()
    };
  }

  /**
   * Populate this collection with a provided version/model
   */
  fromLiteral({version, model}): void {
    this.version = version;
    // TODO(lindner): this might not be initialized yet...
    this._model = new CrdtCollectionModel(model);
  }

  async _toList() {
    if (this.referenceMode) {
      const items = (await this.getModel()).toLiteral();
      if (items.length === 0) {
        return [];
      }
      const refSet = new Set();
      items.forEach(item => refSet.add(item.value.storageKey));
      assert(refSet.size === 1, `multiple storageKeys in reference set of collection not yet supported.`);
      const ref = refSet.values().next().value;

      await this.ensureBackingStore();

      const retrieveItem = async item => {
        const ref = item.value;
        return {id: ref.id, value: await this.backingStore.get(ref.id), keys: item.keys};
      };

      return await Promise.all(items.map(retrieveItem));
    }
    return (await this.getModel()).toLiteral();
  }

  async toList() {
    return (await this._toList()).map(item => item.value);
  }

  /**
   * Returns an array of values for each of the specified ids.
   *
   * @param ids items to fetch from the underlying CRDT model.
   * @return an array of values from the underlying CRDT
   */
  async getMultiple(ids: string[]) {
    assert(!this.referenceMode, 'getMultiple not implemented for referenceMode stores');
    const model = await this.getModel();
    return ids.map(id => model.getValue(id));
  }

  /**
   * Store multiple values with the given keys in the Collection.
   * TODO(lindner): document originatorId, which is unused.
   */
  async storeMultiple(values, keys, originatorId = null) {
    assert(!this.referenceMode, 'storeMultiple not implemented for referenceMode stores');

    this.getModelAndUpdate(crdtmodel => {
      values.map(value => crdtmodel.add(value.id, value, keys));
      return crdtmodel;
    });
  }

  /**
   * Get a specific Id value previously set using store().
   *
   * @remarks Note that the id referred to here is not the same as
   * used in the constructor.
   */
  async get(id) {
    if (this.referenceMode) {
      const ref = (await this.getModel()).getValue(id);
      if (ref == null) {
        return null;
      }
      await this.ensureBackingStore();
      return await this.backingStore.get(ref.id);
    }

    const model = await this.getModel();
    return model.getValue(id);
  }

  /**
   * Store the specific value to the collection.  Value must include an id entry.
   *
   * @param value A data object with an id entry that is used as a key.
   * @param keys The CRDT keys used to store this object
   * @param originatorId TBD passed to event listeners
   */
  async store(value, keys: string[], originatorId = null): Promise<void> {
    assert(keys != null && keys.length > 0, 'keys required');
    const id = value.id;

    const changeEvent = {value, keys, effective: undefined};

    if (this.referenceMode) {
      const referredType = this.type.primitiveType();
      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);

      // Update the referred data
      await this.getModelAndUpdate(crdtmodel => {
        changeEvent.effective = crdtmodel.add(value.id, {id: value.id, storageKey}, keys);
        return crdtmodel;
      });

      await this.ensureBackingStore();
      await this.backingStore.store(value, keys);
    } else {
      await this.getModelAndUpdate(crdtmodel => {
        // check for existing keys?
        changeEvent.effective = crdtmodel.add(value.id, value, keys);
        return crdtmodel;
      });
    }

    this.version++;

    // Notify Listeners
    this._fire('change', {add: [changeEvent], version: this.version, originatorId});
  }

  async removeMultiple(items, originatorId=null) {
    await this.getModelAndUpdate(crdtmodel => {
      
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
      return crdtmodel;
    }).then(() => {
      this._fire('change', {remove: items, version: this.version, originatorId});
    });
  }

  /**
   * Remove ids from a collection for specific keys.
   * @param id the id to remove.
   * @param keys the CRDT specific keys to remove.
   * @param originatorId TBD passed to event listeners.
   */
  async remove(id, keys: string[] = [], originatorId = null) {
    await this.getModelAndUpdate(crdtmodel => {
      if (keys.length === 0) {
        keys = crdtmodel.getKeys(id);
      }
      const value = crdtmodel.getValue(id);

      if (value !== null) {
        const effective = crdtmodel.remove(id, keys);
        // TODO(lindner): isolate side effects...
        this.version++;
        this._fire('change', {remove: [{value, keys, effective}], version: this.version, originatorId});
      }
      return crdtmodel;
    });
  }

  /**
   * Triggered when the storage key has been modified.  For now we
   * just refetch and trigger listeners.  This is fast since the data
   * is synced locally.
   */
  public onRemoteStateSynced(doc: PouchDB.Core.ExistingDocument<{}>) {
    // updates internal state
    const previousRev = this._rev;
    const previousModel = this._model;

    if (this._rev === doc._rev) {
      return;
    }
    // remote revision is different, update local copy.
    const model = doc['model'];

    this._model = new CrdtCollectionModel(model);
    this._rev = doc._rev;
    this.version++;

    // TODO(lindner): handle referenceMode
    // TODO(lindner): calculate added/removed keys from previousModel/model
    // TODO(lindner): fire change events here?
    //   this._fire('change', {originatorId: null, version: this.version, add, remove});
  }

  /**
   * Updates the local model cache from PouchDB and returns the CRDT
   * model for use.
   */
  private async getModel(): Promise<CrdtCollectionModel> {
    try {
      const result = await this.db.get(this.pouchDbKey.location);

      // compare revisions
      if (this._rev !== result._rev) {
        // remote revision is different, update local copy.
        this._model = new CrdtCollectionModel(result['model']);
        this._rev = result._rev;
        this.version++; // yuck.
        // TODO(lindner): fire change events here?
      }
    } catch (err) {
      if (err.name === 'not_found') {
        this._model = new CrdtCollectionModel();
        this._rev = undefined;
      }
      // Unexpected error
      console.warn('PouchDbCollection.getModel err=', err);
      throw err;
    }
    return this._model;
  }

  /**
   * Provides a way to apply changes to the model in a way that will result in the
   * crdt being written to the underlying PouchDB.
   *
   * - A new entry is stored if it doesn't exists.
   * - If the existing entry is available it is fetched and the
   *   internal state is updated.
   * - A copy of the CRDT model is passed to the modelMutator, which may change it.
   * - If the model is mutated by `modelMutator`, write a new revision and update the local
   *   cached copy.
   *
   * @param modelMutator allows for modifying a copy of the underlying crdt model.
   */
  private async getModelAndUpdate(modelMutator: CrdtCollectionModelMutator): Promise<CrdtCollectionModel> {
    // Keep retrying the operation until it succeeds.
    while (1) {
      // TODO(lindner): add backoff and error out if this goes on for too long
      let doc;
      //: PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & Model & {referenceMode: boolean, type: {}};

      let notFound = false;
      try {
        doc = await this.db.get(this.pouchDbKey.location);
        // as PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & Model & {referenceMode: boolean, type: };

        // Check remote doc.
        // TODO(lindner): refactor with getModel above.
        if (this._rev !== doc._rev) {
          // remote revision is different, update local copy.
          this._model = new CrdtCollectionModel(doc['model']);
          this._rev = doc._rev;
          this.version++;
          // TODO(lindner): fire change events here?
        }
      } catch (err) {
        if (err.name !== 'not_found') {
          throw err;
        }
        notFound = true;
        // setup basic doc, model/version updated below.
        doc = {
          _id: this.pouchDbKey.location,
          referenceMode: this.referenceMode,
          type: this.type.toLiteral()
        };
      }

      // Run the mutator on a copy of the existing model
      // TODO(lindner): check about how many times we call toLiteral here.
      const newModel = modelMutator(new CrdtCollectionModel(this._model.toLiteral()));

      // Check if the mutator made any changes..
      // TODO(lindner): consider changing the api to let the mutator tell us if changes were made.
      if (!notFound && JSON.stringify(this._model.toLiteral()) === JSON.stringify(newModel.toLiteral())) {
        // mutator didn't make any changes.
        return this._model;
      }

      // Apply changes made by the mutator
      doc['model'] = newModel.toLiteral();
      doc['version'] = this.version;

      // Update on pouchdb
      try {
        const putResult = await this.db.put(doc);

        // success! update local with new model
        this._rev = putResult.rev;
        this._model = newModel;

        return this._model;
      } catch (err) {
        if (err.name === 'conflict') {
          // keep trying;
        } else {
          // failed to write new doc, give up.
          console.warn('PouchDbCollection.getModelAndUpdate (err,doc)=', err, doc);
          throw err;
        }
      }
    } // end while (1)

    // can never get here..
    return null;
  }

  /**
   * Remove this item from the database for testing purposes.
   */
  async clearItemsForTesting(): Promise<void> {
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
    this._model = new CrdtCollectionModel();
    this._rev = undefined;
  }
}
