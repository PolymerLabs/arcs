import {assert} from '../../../../platform/assert-web.js';
import {PouchDbStorageProvider} from "./pouch-db-storage-provider";
import {PouchDbStorage} from "./pouch-db-storage";

interface VariableStorage {
  id: string;
  storageKey?: string;  // optional for referencemode
  rawData?: {};
}

interface VariableStorageMutator {
  (value: VariableStorage) : VariableStorage;
}

export class PouchDbVariable extends PouchDbStorageProvider {
  _stored: VariableStorage|null;

  private localKeyId = 0;
  
  constructor(type, storageEngine: PouchDbStorage, name: string, id: string, key: string) {
    super(type, name, id, key);
    console.log("VAR new" + ' name='  + name + ' key=' + key + ' id=' + id + ' type=' + type);
    this.storageEngine = storageEngine;
    this._stored = null;
    this.backingStore = null;
  }

  backingType() {
    return this.type;
  }

  clone() {
    const variable = new PouchDbVariable(this.type, this.storageEngine, this.name, this.id, null);
    variable.cloneFrom(this);
    return variable;
  }

  async cloneFrom(handle) {
    this.referenceMode = handle.referenceMode;
    const literal = await handle.toLiteral();
    console.log('VAR cloneFrom');
    if (this.referenceMode && literal.model.length > 0) {
      await Promise.all([this.ensureBackingStore(), handle.ensureBackingStore()]);
      literal.model = literal.model.map(({id, value}) => ({id, value: {id: value.id, storageKey: this.backingStore.storageKey}}));
      const underlying = await handle.backingStore.getMultiple(literal.model.map(({id}) => id));
      await this.backingStore.storeMultiple(underlying, [this.storageKey]);
    }
    
    this.fromLiteral(literal);
    // TODO(lindner): ask shane why this doesn't fire 'change' events like firebase does...
    if (literal && literal.model && literal.model.length === 1) {
      const newvalue = literal.model[0].value;
      if (newvalue) {
        try {
          // TODO(lindner); skip if values are the same.
          await this.set(newvalue);

          // TODO(lindner): refactor with code in set() that does the same thing.
          // currently it checks if _stored == the new value and discards writes.
        try {
          const response = await this.retryIt({
            _id: this.pouchKeyLocation,
            type: this.type.toLiteral(),
            value: newvalue,
          });
          console.log('VAR cloneFrom put doc id=' + response.id + ' rev=' + response.rev + ' ok=' + response.ok);
        } catch (err) {
          console.log('VAR err cloneFrom putting id=', newvalue, 'error', err);
          throw err;
        }

        } catch (err) {
          console.log('VAR cloneFrom err', newvalue, err);
        }
      }
    }
  }

  async modelForSynchronization() {
    console.log('VAR modelForSync');
    if (this.referenceMode && this._stored !== null) {
      const value = this._stored;

      await this.ensureBackingStore();
      const result = await this.backingStore.get(value.id);
      return {
        version: this.version,
        model: [{id: value.id, value: result}]
      };
    }
    
    return super.modelForSynchronization();
  }

  // Returns {version, model: [{id, value}]}
  async toLiteral() {
    const value = this._stored;
    let model = [];
    if (value != null) {
      model = [{
        id: value.id,
        value,
      }];
    }
    return {
      version: this.version,
      model,
    };
  }

  async fromLiteral({version, model}) {
    const value = model.length === 0 ? null : model[0].value;
    if (this.referenceMode && value && value.rawData) {
      assert(false, `shouldn't have rawData ${JSON.stringify(value.rawData)} here`);
    }
    assert(value !== undefined);
    this._stored = value;
    this.version = version;
    // TODO(plindner): Mimic firebase?
    // TODO(plindner): firebase fires 'change' events here...
  }

  traceInfo() {
    return {stored: this._stored !== null};
  }

  /**
   * Returns a promise containing the variable value or null if it does not exist.
   */  
  async get() {
    console.log('VAR get refmode=' + this.referenceMode);
    // TODO(lindner): why do we need local _stored for refmode?
    if (this.referenceMode && this._stored) {
      try {
        const doc = await this.db.get(this.pouchDbKey.location);
        const value = doc['value'] as VariableStorage;

        await this.ensureBackingStore();
        const result = await this.backingStore.get(value.id);
        return result;
      } catch (err) {
        console.warn('VAR get', err);
        throw err;
      }
    }

    // Validate against pouchdb
    try {
      console.log('VAR GET');
      const doc = await this.db.get(this.pouchDbKey.location);

      if (JSON.stringify(this._stored) !== JSON.stringify(doc['value'])) {
        console.log("VAR get diff: ", doc['value'], this._stored);
        throw new Error('mismatched');
      }
      return doc['value'];
    } catch (err) {
      // Not in db, contract says return null.
      if (err.name === 'not_found') {
        return null;
      }
      console.log('VAR get err stored/err', this._stored, err);
      // Cannot find the value.
      throw err;
    }
  }

  async set(value : {id: string}, originatorId=null, barrier=null) {
    assert(value !== undefined);
    console.log('VAR set');

    if (this.referenceMode && value) {
      // Even if this value is identical to the previously written one,
      // we can't suppress an event here because we don't actually have
      // the previous value for comparison (that's down in the backing store).
      // TODO(shans): should we fetch and compare in the case of the ids matching?

      const referredType = this.type;

      const storageKey = this.backingStore ? this.backingStore.storageKey : this.storageEngine.baseStorageKey(referredType, this.storageKey);

      // Store the indirect pointer to the storageKey
      await this.getStoredAndUpdate((stored) => {
        return {id: value.id, storageKey};
      });

      await this.ensureBackingStore();
      
      // TODO(shans): mutating the storageKey here to provide unique keys is
      // a hack that can be removed once entity mutation is distinct from collection
      // updates. Once entity mutation exists, it shouldn't ever be possible to write
      // different values with the same id. 
      await this.backingStore.store(value, [this.storageKey + this.localKeyId++]);
    } else {
      // If there's a barrier set, then the originating storage-proxy is expecting
      // a result so we cannot suppress the event here.
      if (JSON.stringify(this._stored) === JSON.stringify(value) &&
          barrier == null) {
        return;
      }

      // Store local value
      this._stored = value;

      // Update Pouch, If value is null delete key, otherwise store it.
      if (value == null) {
        try {
          console.log('VAR remove');
          const doc = await this.db.get(this.pouchKeyLocation);
          await this.db.remove(doc);
        } catch (err) {
          // Deleting already deleted
          if (err.name !== 'not_found') {
            console.log('VAR remove err=', err);
          }
          console.warn('VAR set err', err);
        }
      } else {
        // Write to Pouch Database
        try {
          const response = await this.retryIt({
            _id: this.pouchKeyLocation,
            type: this.type.toLiteral(),
            value,
          });
          console.log('VAR set doc id=' + response.id + ' rev=' + response.rev + ' ok=' + response.ok);
        } catch (err) {
          console.log('VAR set err putting id=', value, 'error', err);
          throw err;
        }
      }
    }
    this.version++;
    if (this.referenceMode) {
      await this._fire('change', {data: value, version: this.version, originatorId, barrier});
    } else {
      await this._fire('change', {data: this._stored, version: this.version, originatorId, barrier});
    }
  }

  async clear(originatorId=null, barrier=null) {
    await this.set(null, originatorId, barrier);
  }


  /**
   * Provides a way to apply changes to the model in a way that will result in the
   * crdt being written to the underlying PouchDB.
   * 
   * - A new entry is stored if it doesn't exists.
   * - If the existing entry is available it is fetched
   * - If revisions differ a new item is written.
   */
  private async getStoredAndUpdate(variableStorageMutator: VariableStorageMutator): Promise<VariableStorage> {
    console.log('UPDATING STORAGE', this._stored);
    // Keep retrying the operation until it succeeds.
    while (1) {
      let doc;
      //: PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & Model & {referenceMode: boolean, type: {}};

      let notFound = false;
      try {
        doc = await this.db.get(this.pouchDbKey.location);
        // Check remote doc.
        // TODO(lindner): refactor with getModel above.
        if (this._rev !== doc._rev) {
          // remote revision is different, update local copy.
          this._stored = doc['value'];
          this._rev = doc._rev;
          this.version++;  // yuck.
          console.log('VAR diff, updating model', doc['model']);
          // TODO(lindner): fire change events here?
        }

      } catch (err) {
        if (err.name !== 'not_found') {
          throw err;
        }
        notFound = true;
        // setup basic doc, model/version updated below.
        doc = {
          _id: this.pouchDbKey.location
        };
        console.log('NOT FOUND*****');
      }

      // Run the mutator on a copy of the existing model
      const newValue = variableStorageMutator({ ...this._stored });
      
      // Check if the mutator made any changes..
      if (!notFound && JSON.stringify(this._stored) === JSON.stringify(newValue)) {
        // mutator didn't make any changes.
        
        console.log('NOT CHANGED', JSON.stringify(this._stored));
        return this._stored;
      }
      
      // Apply changes made by the mutator
      doc['value'] = newValue;
      doc['version'] = this.version;

      // Update on pouchdb
      try {
        const putResult = await this.db.put(doc);
        console.log('VARPUUUUT', putResult, doc);
        // success! update local with new model
        this._rev = putResult.rev;
        this._stored = newValue;
        
        return this._stored;
      } catch (err) {
        if (err.name === 'conflict') {
          // keep trying;
        } else {
          // failed to write new doc, give up.
          console.warn('VAR getValue cannot write:', err, doc);
          throw err;
        }
      }
    } // end while (1)

    // can never get here..
    return null;
  }
}
