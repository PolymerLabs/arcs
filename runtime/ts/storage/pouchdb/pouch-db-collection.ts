import {CrdtCollectionModel, Model} from '../crdt-collection-model.js';
import {Tracing} from '../../../../tracelib/trace.js';
import {assert} from '../../../../platform/assert-web.js';
import {PouchDbStorageProvider} from "./pouch-db-storage-provider.js";
import {Type} from "../../type.js";
import {PouchDbStorage} from "./pouch-db-storage";


/**
 * Defines a callback interface to allow for modifying a
 * CrdtCollectionModel during a get/modify/set cycle.
 */ 
interface CrdtCollectionModelMutator {
  (crdt: CrdtCollectionModel) : CrdtCollectionModel;
}

export class PouchDbCollection extends PouchDbStorageProvider {
  /** The local synced model */
  _model: CrdtCollectionModel;
  /** The revision we received from the pouch server */
  _rev: string|undefined;

  constructor(type: Type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, name, id, key);
    console.log("COL" + ' name='  + name + ' key=' + key + ' id=' + id + ' type=' + type);

    this._model = new CrdtCollectionModel(); // XX
    this.storageEngine = storageEngine;
    assert(this.version !== null);
  }

  backingType() {
    return this.type.primitiveType();
  }

  clone() {
    const handle = new PouchDbCollection(this.type, this.storageEngine, this.name, this.id, null);
    handle.cloneFrom(this);
    return handle;
  }

  async cloneFrom(handle) {
    console.log('COL cloneFrom');
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

  async modelForSynchronization() {
    return {
      version: this.version,
      model: await this._toList()
    };
  }

  // Returns {version, model: [{id, value, keys: []}]}
  async toLiteral() {
    return {
      version: this.version,
      model: (await this.getModel()).toLiteral()
    };
  }

  fromLiteral({version, model}) {
    this.version = version;
    // TODO(plindner): this might not be initialized yet...
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

  async getMultiple(ids) {
    assert(!this.referenceMode, "getMultiple not implemented for referenceMode stores");
    const model = await this.getModel();
    return ids.map(id => model.getValue(id));
  }

  async storeMultiple(values, keys, originatorId=null) {
    console.log('COL storeMultiple ' + values);
    assert(!this.referenceMode, "storeMultiple not implemented for referenceMode stores");

    this.getModelAndUpdate((crdtmodel) => {
      values.map(value => crdtmodel.add(value.id, value, keys));
      return crdtmodel;
    });
  }

  async get(id) {
    console.log('COL get called id=' + id);
    if (this.referenceMode) {
      console.log('REFERENCE');
      const ref = (await this.getModel()).getValue(id);
      if (ref == null) {
        return null;
      }
      await this.ensureBackingStore();
      const result = await this.backingStore.get(ref.id);
      return result;
    }
    
    const model = await this.getModel();
    console.log('MODEL for id =', model);
    return model.getValue(id);
  }

  async store(value, keys: string[], originatorId=null) {
    assert(keys != null && keys.length > 0, 'keys required');
    const id = value.id;
    
    const changeEvent = {value, keys, effective: undefined};

    if (this.referenceMode) {
      const referredType = this.type.primitiveType();
      //const storageKey = this.backingStore ? this.backingStore.storageKey : this.storageEngine.baseStorageKey(referredType, this.storageKey);
      const storageKey = this.storageEngine.baseStorageKey(referredType, this.storageKey);

      console.log('HERE');

      await this.getModelAndUpdate((crdtmodel) => {
        console.log("YY ", crdtmodel, value, keys);
        changeEvent.effective = crdtmodel.add(value.id, {id: value.id, storageKey}, keys);
        return crdtmodel;
      });

      await this.ensureBackingStore();
      await this.backingStore.store(value, keys);
    } else {
      console.log("COL ADD storageKey='" + this.storageKey + "' id/value/keys=", value, keys);
      //console.log("COL store storageKey='" + this.storageKey);
      
      await this.getModelAndUpdate((crdtmodel) => {
        // check for existing keys?
        changeEvent.effective = crdtmodel.add(value.id, value, keys);
        return crdtmodel;
      });
    }

    this.version++;

    // 2. Notify Listeners
    this._fire('change', {add: [changeEvent], version: this.version, originatorId});
  }

  async remove(id, keys:string[] = [], originatorId=null) {

    await this.getModelAndUpdate((crdtmodel) => {
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

  async clearItemsForTesting() {
    // Remove the Pouch Document
    try {
      const doc = await this.db.get(this.pouchDbKey.location);
      await this.db.remove(doc);
    } catch(err) {
      if (err.name !== 'not_found') {
        console.log("clearItemsForTesting: error removing", err);
      }
    }
    this._model = new CrdtCollectionModel();
  }

  /**
   * Update the local model cache from PouchDB.
   */
  private async getModel(): Promise<CrdtCollectionModel> {
    try {
      const result = await this.db.get(this.pouchDbKey.location);
      
      // compare revisions
      if (this._rev !== result._rev) {
        // remote revision is different, update local copy.
        this._model = new CrdtCollectionModel(result['model']);
        this._rev = result._rev;
        this.version++;  // yuck.
        console.log('COL diff, updating model', result['model']);
        // TODO(lindner): fire change events here?
      }

    } catch (err) {
      console.warn('COL getModel:', err);
      this._model = new CrdtCollectionModel();
      this._rev = undefined;
      // TODO(lindner): throw
    }
    return this._model;
  }


  /**
   * Provides a way to apply changes to the model in a way that will result in the
   * crdt being written to the underlying PouchDB.
   * 
   * - A new entry is stored if it doesn't exists.
   * - If the existing entry is available it is fetched
   * - If revisions differ a new item is written.
   */
  private async getModelAndUpdate(modelMutator: CrdtCollectionModelMutator): Promise<CrdtCollectionModel> {
    console.log('UPDATING MODEL', this._model);
    // Keep retrying the operation until it succeeds.
    while (1) {
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
          this.version++;  // yuck.
          console.log('COL diff, updating model', doc['model']);
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
        console.log('NOT FOUND*****');
      }

      // Run the mutator on a copy of the existing model
      const newModel = modelMutator(new CrdtCollectionModel(this._model.toLiteral()));
      
      // Check if the mutator made any changes..
      if (!notFound && JSON.stringify(this._model.toLiteral()) === JSON.stringify(newModel.toLiteral())) {
        // mutator didn't make any changes.
        
        console.log('NOT CHANGED', JSON.stringify(this._model.toLiteral()));
        return this._model;
      }
      
      // Apply changes made by the mutator
      doc['model'] = newModel.toLiteral();
      doc['version'] = this.version;

      // Update on pouchdb
      try {
        const putResult = await this.db.put(doc);
        console.log('PUUUUT', putResult, doc);
        // success! update local with new model
        this._rev = putResult.rev;
        this._model = newModel;
        
        return this._model;
      } catch (err) {
        if (err.name === 'conflict') {
          // keep trying;
        } else {
          // failed to write new doc, give up.
          console.warn('COL getModelAndUpdate:', err);
          throw err;
        }
      }
    } // end while (1)

    // can never get here..
    return null;
  }
}
